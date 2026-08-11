// Radar v1 — étage 0 de l'usine. Cron quotidien sur le VPS.
// Mine les tops des catégories cibles (spectre LARGE : D6 — éducation,
// jeux, santé, parentalité…), détecte les incumbents FAIBLES sur besoin
// PROUVÉ, échantillonne leurs avis 1-3★, et upserte la file « Idées ».
// L'IA n'intervient pas ici : tout le scoring est du code auditable.

import { neon } from "@neondatabase/serverless";
import gplay from "google-play-scraper";

const sql = neon(process.env.DATABASE_URL ?? "");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}

const JOB = "radar";
const CADENCE_SEC = 86400; // quotidien
const PAYS = "us"; // marché principal v1 ; multi-pays en v1.1

// Spectre large (directive D6) — catégories Google Play.
const CATEGORIES = [
  ["EDUCATION", gplay.category.EDUCATION],
  ["JEUX_EDUCATIFS", gplay.category.GAME_EDUCATIONAL],
  ["JEUX_CASUAL", gplay.category.GAME_CASUAL],
  ["JEUX_PUZZLE", gplay.category.GAME_PUZZLE],
  ["SANTE_FITNESS", gplay.category.HEALTH_AND_FITNESS],
  ["PARENTALITE", gplay.category.PARENTING],
  ["PRODUCTIVITE", gplay.category.PRODUCTIVITY],
  ["LIFESTYLE", gplay.category.LIFESTYLE],
];

const TOP_PAR_CATEGORIE = 30; // apps examinées par catégorie
const MAX_IDEES_AVIS = 15; // idées dont on échantillonne les avis (coût réseau)
const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Verrou anti-chevauchement atomique (PATTERN §3) -----------------
// running > 2× cadence = crash → marqué error, le verrou se libère seul.
async function poserVerrou() {
  await sql`
    update cron_heartbeats set status = 'error',
      note = 'verrou libéré automatiquement (running > 2× cadence = crash)',
      finished_at = now()
    where job = ${JOB} and status = 'running'
      and started_at < now() - make_interval(secs => ${2 * CADENCE_SEC})`;
  const rows = await sql`
    insert into cron_heartbeats (id, job, status, expected_every_sec)
    select gen_random_uuid()::text, ${JOB}, 'running', ${CADENCE_SEC}
    where not exists (
      select 1 from cron_heartbeats where job = ${JOB} and status = 'running'
    )
    returning id`;
  return rows[0]?.id ?? null;
}

async function fermerVerrou(id, status, note) {
  await sql`update cron_heartbeats set status = ${status}, note = ${note},
    finished_at = now() where id = ${id}`;
}

// --- Scoring PAR CODE (auditable, bornes explicites) ------------------
// Opportunité = demande PROUVÉE × leader FAIBLE × moat d'avis franchissable.
//   demande  : log10(installs)   — 0 si < 100k (pas de demande prouvée)
//   faiblesse: 4.5 − note        — 0 si note ≥ 4.3 (leader solide)
//   moat     : log10(nb avis)    — plus le leader a d'avis, plus dur de se classer
function scorer({ minInstalls, score, ratings }) {
  if (!minInstalls || minInstalls < 100_000) return 0;
  if (!score || score >= 4.3) return 0;
  const demande = Math.min(Math.log10(minInstalls), 9) / 9; // 0..1
  const faiblesse = Math.min(Math.max(4.5 - score, 0), 1.5) / 1.5; // 0..1
  const moat = Math.min(Math.log10(Math.max(ratings ?? 10, 10)), 7) / 7; // 0..1
  return Math.round(100 * demande * faiblesse * (1 - 0.6 * moat));
}

async function avisNegatifs(appId) {
  try {
    const r = await gplay.reviews({
      appId,
      country: PAYS,
      sort: gplay.sort.NEWEST,
      num: 60,
    });
    return (r.data ?? [])
      .filter((a) => a.score <= 3 && (a.text ?? "").length > 30)
      .slice(0, 6)
      .map((a) => ({ note: a.score, extrait: a.text.slice(0, 280) }));
  } catch (e) {
    return [{ note: 0, extrait: `échantillonnage impossible: ${String(e).slice(0, 120)}` }];
  }
}

async function run() {
  const candidats = [];
  for (const [nom, cat] of CATEGORIES) {
    try {
      const top = await gplay.list({
        category: cat,
        collection: gplay.collection.TOP_FREE,
        num: TOP_PAR_CATEGORIE,
        country: PAYS,
      });
      for (const app of top) {
        await dodo(400); // throttling — jamais agressif (risque contractuel)
        try {
          const d = await gplay.app({ appId: app.appId, country: PAYS });
          const s = scorer({ minInstalls: d.minInstalls, score: d.score, ratings: d.ratings });
          if (s > 0) {
            candidats.push({
              categorie: nom,
              appRef: d.appId,
              titre: d.title,
              metrics: {
                installs: d.minInstalls,
                note: Math.round(d.score * 100) / 100,
                avis: d.ratings,
                prix: d.priceText ?? "gratuit",
                genre: d.genre,
                pays: PAYS,
              },
              score: s,
            });
          }
        } catch {
          // app dépubliée/région bloquée : on passe, le radar reste factuel
        }
      }
      console.log(`${nom}: ${top.length} apps examinées`);
    } catch (e) {
      console.error(`${nom}: échec de listing — ${String(e).slice(0, 200)}`);
    }
    await dodo(1500);
  }

  candidats.sort((a, b) => b.score - a.score);
  const retenus = candidats.slice(0, 40);

  // Avis 1-3★ pour les meilleures opportunités (le début du dossier wedge)
  for (const c of retenus.slice(0, MAX_IDEES_AVIS)) {
    await dodo(800);
    c.metrics.plaintes = await avisNegatifs(c.appRef);
  }

  for (const c of retenus) {
    const id = `${c.categorie}:${c.appRef}`;
    const resume = `Leader faible sur besoin prouvé : ${c.metrics.installs.toLocaleString("fr-FR")}+ installs, note ${c.metrics.note} (${c.metrics.avis?.toLocaleString("fr-FR")} avis).`;
    // Upsert par id — le statut d'une idée déjà triée par l'humain est CONSERVÉ.
    await sql`
      insert into ideas (id, categorie, app_ref, titre, resume, metrics, score, status)
      values (${id}, ${c.categorie}, ${c.appRef}, ${c.titre}, ${resume}, ${JSON.stringify(c.metrics)}, ${c.score}, 'nouvelle')
      on conflict (id) do update set
        titre = excluded.titre, resume = excluded.resume,
        metrics = excluded.metrics, score = excluded.score, seen_at = now()`;
  }
  return { examinees: CATEGORIES.length * TOP_PAR_CATEGORIE, idees: retenus.length };
}

// --- main -------------------------------------------------------------
const verrou = await poserVerrou();
if (!verrou) {
  console.log("run déjà en cours — abandon (verrou)");
  process.exit(0);
}
try {
  const { examinees, idees } = await run();
  await fermerVerrou(verrou, "ok", `${idees} idées upsertées (${examinees} apps examinées)`);
  console.log(`OK — ${idees} idées`);
} catch (e) {
  await fermerVerrou(verrou, "error", String(e).slice(0, 500));
  console.error("ÉCHEC:", e);
  process.exit(1);
}
