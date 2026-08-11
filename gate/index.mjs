// Gate de viabilité v1 — étage 1 de l'usine. Cron horaire sur le VPS.
// Traite UNE idée `a_analyser` sans dossier par passe : enrichit les
// données (avis réels, teardown des similaires), fait argumenter l'IA
// (wedge → 3 tours adversariaux → 4 critiques indépendants), puis le
// CODE calcule probabilité et verdict go/pivot/kill. L'humain garde le
// gate final dans le cockpit. Méthode : skill product-wedge-analysis.

import { neon } from "@neondatabase/serverless";
import gplay from "google-play-scraper";

const sql = neon(process.env.DATABASE_URL ?? "");
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? "";
if (!process.env.DATABASE_URL || !DEEPSEEK_KEY) {
  console.error("DATABASE_URL ou DEEPSEEK_API_KEY manquant");
  process.exit(1);
}

const JOB = "gate-viabilite";
const CADENCE_SEC = 3600;
const MODELE = "deepseek-chat";
const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Verrou + heartbeat (même pattern que le radar) -------------------
async function poserVerrou() {
  await sql`update cron_heartbeats set status = 'error',
    note = 'verrou libéré automatiquement (running > 2× cadence = crash)', finished_at = now()
    where job = ${JOB} and status = 'running'
      and started_at < now() - make_interval(secs => ${2 * CADENCE_SEC})`;
  const rows = await sql`
    insert into cron_heartbeats (id, job, status, expected_every_sec)
    select gen_random_uuid()::text, ${JOB}, 'running', ${CADENCE_SEC}
    where not exists (select 1 from cron_heartbeats where job = ${JOB} and status = 'running')
    returning id`;
  return rows[0]?.id ?? null;
}
const fermerVerrou = (id, status, note) =>
  sql`update cron_heartbeats set status = ${status}, note = ${note}, finished_at = now() where id = ${id}`;

// --- LLM : une tâche = une sortie JSON contrainte, parsée défensivement.
// Incident réel (2026-08-11) : réponse tronquée par max_tokens → JSON
// invalide. D'où : consigne de compacité, détection finish_reason=length,
// et UNE re-tentative plus contrainte avant d'échouer.
async function appelBrut(system, user, maxTokens) {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELE,
      messages: [
        { role: "system", content: system + " Réponds en JSON COMPACT : strings courtes, jamais plus de 6 éléments par tableau." },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return { txt: d.choices?.[0]?.message?.content ?? "{}", fini: d.choices?.[0]?.finish_reason };
}

async function ia(system, user, maxTokens = 3000) {
  for (let essai = 1; essai <= 2; essai++) {
    const { txt, fini } = await appelBrut(
      essai === 1 ? system : system + " IMPÉRATIF : citations ≤ 140 caractères, 4 éléments max par tableau.",
      user,
      essai === 1 ? maxTokens : maxTokens + 1500,
    );
    let t = txt;
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) t = t.slice(a, b + 1); // parse défensif (fences)
    try {
      if (fini === "length") throw new Error("tronqué");
      return JSON.parse(t);
    } catch (e) {
      if (essai === 2) throw e;
      await dodo(500);
    }
  }
}

// --- Check sherlocking PAR CODE (liste de capacités natives OS) -------
const NATIFS = [
  ["lampe|flashlight", "Lampe torche native"],
  ["scanner|scan pdf|qr code", "Scanner de documents/QR natif (Appareil photo/Fichiers)"],
  ["minuteur|timer|chrono", "Minuteurs natifs (Horloge)"],
  ["suivi colis|package track", "Suivi de colis natif (Wallet iOS 26)"],
  ["suivi vol|flight track", "Suivi de vols natif (iOS 26 — cas Flighty)"],
  ["filtrage appel|call screen|spam call", "Filtrage d'appels natif (Call Screening)"],
  ["mot de passe|password", "Gestionnaire de mots de passe natif"],
  ["fond d'écran|wallpaper", "Fonds d'écran natifs — catégorie 4.3(b) refusée par Apple"],
  ["enregistr(ement|eur) (vocal|audio)|voice memo", "Dictaphone natif"],
  ["sommeil|sleep track", "Suivi du sommeil natif (Santé/Watch)"],
  ["podomètre|step count", "Podomètre natif (Santé/Fit)"],
  ["traduc", "Traduction native (Apple/Google Translate intégrés)"],
];
function checkSherlocking(texte) {
  const t = texte.toLowerCase();
  return NATIFS.filter(([re]) => new RegExp(re).test(t)).map(([, label]) => label);
}

// --- Verdict PAR CODE (seuils explicites, décote données maigres) -----
function calculerVerdict(critiques, nbAvis) {
  const scores = critiques.map((c) => Math.max(0, Math.min(100, Number(c.score) || 0)));
  const kills = critiques.filter((c) => c.kill === true);
  let probabilite = Math.round(
    (scores[0] * 1.5 + scores[1] + scores[2] + scores[3]) / 4.5, // distribution pèse 1,5×
  );
  if (nbAvis < 30) probabilite -= 10; // décote : données maigres
  probabilite = Math.max(0, Math.min(100, probabilite));
  let verdict;
  if (kills.length > 0 || probabilite < 35) verdict = "kill";
  else if (probabilite >= 55 && Math.min(...scores) >= 40) verdict = "go";
  else verdict = "pivot";
  return { probabilite, verdict, kills: kills.map((k) => k.raison) };
}

// --- Enrichissement AVANT de générer (sources pauvres → IA invente) ---
async function enrichir(idee) {
  const manuelle = !idee.app_ref;
  let plaintes = [];
  let similaires = [];
  let nbAvis = 0;
  if (!manuelle) {
    try {
      const r = await gplay.reviews({ appId: idee.app_ref, country: "us", sort: gplay.sort.NEWEST, num: 150 });
      plaintes = (r.data ?? [])
        .filter((a) => a.score <= 3 && (a.text ?? "").length > 25)
        .slice(0, 40)
        .map((a) => `${a.score}★ ${a.text.slice(0, 220)}`);
      nbAvis = plaintes.length;
    } catch { /* app régionale : le dossier le signalera */ }
    try {
      const sim = await gplay.similar({ appId: idee.app_ref, country: "us" });
      for (const s of sim.slice(0, 8)) {
        await dodo(300);
        try {
          const d = await gplay.app({ appId: s.appId, country: "us" });
          similaires.push({ titre: d.title, note: Math.round(d.score * 100) / 100, avis: d.ratings, installs: d.minInstalls });
        } catch { /* ignorer */ }
      }
    } catch { /* idem */ }
  }
  return { manuelle, plaintes, similaires, nbAvis };
}

async function analyser(idee) {
  const { manuelle, plaintes, similaires, nbAvis } = await enrichir(idee);
  const contexte = `IDÉE: ${idee.titre} (catégorie ${idee.categorie})
RÉSUMÉ: ${idee.resume}
MÉTRIQUES: ${JSON.stringify(idee.metrics).slice(0, 800)}
PLAINTES RÉELLES (avis 1-3★ récents${manuelle ? " — AUCUNE, idée manuelle" : ""}):
${plaintes.join("\n").slice(0, 6000) || "(aucune donnée)"}
CONCURRENTS SIMILAIRES: ${JSON.stringify(similaires)}`;

  // 1 · Thèmes de plaintes (l'IA CLASSE, elle n'invente pas)
  const themes = await ia(
    "Tu es analyste marché. Classe les plaintes RÉELLES fournies en 6 thèmes MAX. N'invente RIEN : chaque thème cite 2 extraits fournis, tronqués à 140 caractères. JSON: {\"themes\":[{\"theme\":str,\"frequence\":int,\"citations\":[str,str]}]}",
    contexte,
  );

  // 2 · Proposition de wedge, puis 3 tours adversariaux
  let proposition = await ia(
    "Tu es stratège produit mobile. Propose UN wedge pour battre cet incumbent faible : la douleur #1 (ancrée dans les plaintes), UNE killer feature (grosse, pas une micro-amélioration, avec critères d'acceptance testables), le canal des 100 premiers utilisateurs (PAS \"les stores\"), la cible précise. JSON: {\"douleur\":str,\"killer_feature\":str,\"acceptance\":[str],\"canal_100\":str,\"cible\":str}",
    contexte + "\nTHÈMES: " + JSON.stringify(themes),
  );
  const toursAdversariaux = [];
  for (let tour = 1; tour <= 3; tour++) {
    const critique = await ia(
      "Tu es un critique PESSIMISTE. Attaque cette proposition sans complaisance : distribution, copiabilité, sherlocking, churn, réalisme. JSON: {\"faiblesses\":[str],\"should_pivot\":bool,\"attaque_principale\":str}",
      `PROPOSITION: ${JSON.stringify(proposition)}\nCONTEXTE: ${contexte.slice(0, 3000)}`,
    );
    toursAdversariaux.push({ tour, critique });
    proposition = await ia(
      "Tu es le stratège. Révise ta proposition pour répondre à la critique — durcis, précise, ou change d'angle si l'attaque est structurelle. Même format JSON que la proposition initiale, plus {\"reponse_critique\":str}.",
      `PROPOSITION: ${JSON.stringify(proposition)}\nCRITIQUE: ${JSON.stringify(critique)}`,
    );
    await dodo(300);
  }

  // 3 · Sherlocking par code (sur titre + genre + douleur + feature)
  const sherlocking = checkSherlocking(
    `${idee.titre} ${idee.metrics?.genre ?? ""} ${proposition.douleur ?? ""} ${proposition.killer_feature ?? ""}`,
  );

  // 3bis · La PROPOSITION DE VALEUR : les features que NOUS apportons.
  // Chaque feature est ancrée dans une douleur réelle des plaintes — c'est
  // ce qui se lit côté administration et se vend derrière.
  const featuresRep = await ia(
    "Tu es product manager mobile. Liste les features DIFFÉRENCIANTES que NOTRE app apporterait face aux concurrents. Max 6, la première est la killer feature. Chaque feature DOIT répondre à une douleur présente dans les plaintes/thèmes fournis — n'invente pas de besoin. JSON: {\"features\":[{\"feature\":str,\"type\":\"killer\"|\"differenciante\"|\"support\",\"douleur\":str,\"pourquoi_absent_chez_eux\":str,\"effort\":\"S\"|\"M\"|\"L\",\"argument_vente\":str}]}",
    `PROPOSITION FINALE: ${JSON.stringify(proposition)}\nTHÈMES DE PLAINTES: ${JSON.stringify(themes).slice(0, 2500)}\nCONCURRENTS: ${JSON.stringify(similaires)}`,
  );
  const features = featuresRep.features ?? [];

  // 4 · Quatre critiques INDÉPENDANTS (une dimension chacun)
  const dims = [
    ["distribution", "Le canal des 100 premiers utilisateurs est-il crédible et répétable ? Une app à 0 avis peut-elle exister face à ce moat d'avis ?"],
    ["produit", "La killer feature justifie-t-elle un switch ? Est-elle copiable en un sprint par l'incumbent ?"],
    ["economie", "Freemium honnête possible ? LTV vs coût d'acquisition réaliste pour un solo ? Commission stores intégrée ?"],
    ["durabilite", "Besoin récurrent (pas one-shot) ? conscient (pas latent) ? durable (pas un pic) ? Risque sherlocking ?"],
  ];
  const critiques = [];
  for (const [dim, question] of dims) {
    const c = await ia(
      `Tu es un critique indépendant et PESSIMISTE, dimension « ${dim} ». En cas de doute, note BAS. JSON: {"score":int_0_100,"kill":bool,"raison":str,"risques":[str]}`,
      `${question}\nSHERLOCKING DÉTECTÉ PAR CODE: ${JSON.stringify(sherlocking)}\nPROPOSITION FINALE: ${JSON.stringify(proposition)}\nFEATURES DIFFÉRENCIANTES PROPOSÉES: ${JSON.stringify(features)}\nCONTEXTE: ${contexte.slice(0, 2200)}`,
    );
    critiques.push({ dimension: dim, ...c });
    await dodo(300);
  }

  // 5 · Verdict PAR CODE
  const { probabilite, verdict, kills } = calculerVerdict(critiques, nbAvis);

  return {
    verdict,
    probabilite,
    dossier: {
      donnees: { nb_plaintes_analysees: nbAvis, manuelle, similaires },
      themes: themes.themes ?? [],
      proposition_finale: proposition,
      features_differenciantes: features,
      tours_adversariaux: toursAdversariaux,
      sherlocking,
      critiques,
      kills,
      methode: "product-wedge-analysis v1 — verdict calculé par code (distribution ×1,5 ; kill si critique kill ou p<35 ; go si p≥55 et min≥40 ; décote -10 si <30 avis)",
    },
  };
}

// --- main : une idée par passe ---------------------------------------
const verrou = await poserVerrou();
if (!verrou) {
  console.log("run déjà en cours — abandon");
  process.exit(0);
}
try {
  const idees = await sql`
    select i.* from ideas i
    left join viability_reports v on v.idea_id = i.id
    where i.status = 'a_analyser' and v.id is null
    order by i.score desc limit 1`;
  if (idees.length === 0) {
    await fermerVerrou(verrou, "ok", "aucune idée en attente");
    console.log("OK — rien à analyser");
    process.exit(0);
  }
  const idee = idees[0];
  console.log("analyse:", idee.id);
  const { verdict, probabilite, dossier } = await analyser(idee);
  await sql`
    insert into viability_reports (id, idea_id, verdict, probability, dossier, model)
    values (${`vr:${idee.id}`}, ${idee.id}, ${verdict}, ${probabilite}, ${JSON.stringify(dossier)}, ${MODELE})
    on conflict (idea_id) do nothing`;
  await fermerVerrou(verrou, "ok", `dossier ${verdict} (p=${probabilite}) pour ${idee.id}`);
  console.log(`OK — ${idee.id}: ${verdict} (p=${probabilite})`);
} catch (e) {
  await fermerVerrou(verrou, "error", String(e).slice(0, 500));
  console.error("ÉCHEC:", e);
  process.exit(1);
}
