// ENRICHISSEMENT EN LOT — porte le catalogue existant au standard v2.
//
// Constat du 2026-08-14 : les 40 leçons anglaises publiées ne contiennent
// AUCUN mini-jeu (texte + quiz seulement, certaines en 2 étapes). Le
// player sait jouer build_prompt / sort_order / fill_blank, mais aucun
// contenu ne s'en sert — et une jumelle française fidèle à une leçon
// pauvre se fait légitimement rejeter par le QA (dimension « jeux »).
// On enrichit donc la SOURCE avant de traduire.
//
// Chaque leçon passe par `index.mjs --enrich` : narration continue,
// mini-jeux, try_it avec exemple. Le brouillon porte enriches_lesson_id ;
// à la publication le cockpit REMPLACE les steps de la leçon d'origine.
// Rien n'est publié ici : la validation reste humaine.
//
// REPRENABLE : une leçon qui a déjà un enrichissement en attente est
// sautée — le lot se relance sans doublon.
//
// Usage : LOCALE=en node enrichir.mjs [--path lp-1] [--max 40]
import { neon } from "@neondatabase/serverless";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));

function envCockpit() {
  const vars = {};
  try {
    for (const ligne of readFileSync(join(ICI, "..", "cockpit", ".env"), "utf8").split("\n")) {
      const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) vars[m[1]] = m[2];
    }
  } catch { /* variables d'environnement seules */ }
  return vars;
}
const env = envCockpit();
const DB_URL = process.env.PROMPTLANDIA_DATABASE_URL ?? env.PROMPTLANDIA_DATABASE_URL ?? "";
const sql = neon(DB_URL);

const LOCALE = process.env.LOCALE ?? "en";
const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : null;
};
const PATH_FILTRE = arg("--path");
const MAX = parseInt(arg("--max") ?? "100", 10);

const lecons = PATH_FILTRE
  ? await sql`select id, path_id, title, steps from lessons
      where locale = ${LOCALE} and path_id = ${PATH_FILTRE} order by order_index`
  : await sql`select id, path_id, title, steps from lessons
      where locale = ${LOCALE} order by path_id, order_index`;

// Déjà enrichie ? (brouillon non rejeté pointant sur cette leçon)
const enAttente = await sql`
  select enriches_lesson_id from lesson_drafts
  where enriches_lesson_id is not null and status <> 'qa_rejected'`;
const dejaFait = new Set(enAttente.map((d) => d.enriches_lesson_id));

const JEUX = ["build_prompt", "sort_order", "fill_blank"];
const estPauvre = (steps) => {
  const types = Array.isArray(steps) ? steps.map((s) => s?.type) : [];
  return types.filter((t) => JEUX.includes(t)).length < 2;
};

const aFaire = lecons.filter((l) => !dejaFait.has(l.id) && estPauvre(l.steps)).slice(0, MAX);
console.log(`${lecons.length} leçon(s) « ${LOCALE} » · ${dejaFait.size} déjà enrichie(s) · ${aFaire.length} à traiter\n`);

function enrichir(id) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [join(ICI, "index.mjs"), "--enrich", id, "--locale", LOCALE], {
      env: {
        ...process.env,
        PROMPTLANDIA_DATABASE_URL: DB_URL,
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? env.DEEPSEEK_API_KEY ?? "",
      },
    });
    let sortie = "";
    p.stdout.on("data", (d) => (sortie += d));
    p.stderr.on("data", (d) => (sortie += d));
    p.on("close", (code) => resolve({ code, sortie }));
  });
}

let ok = 0, rejetes = 0, erreurs = 0;
for (const [n, l] of aFaire.entries()) {
  process.stdout.write(`[${n + 1}/${aFaire.length}] ${l.path_id} · ${l.title.slice(0, 40)} … `);
  const { code, sortie } = await enrichir(l.id);
  if (code !== 0) { erreurs++; console.log(`ERREUR (${sortie.split("\n").slice(-3).join(" | ").slice(0, 160)})`); }
  else if (/→ qa_ok/.test(sortie)) { ok++; console.log("qa_ok ✓"); }
  else if (/→ qa_rejected/.test(sortie)) {
    rejetes++;
    const motif = sortie.match(/ {2}erreurs: (.+)/)?.[1] ?? "scores IA sous le seuil";
    console.log(`rejeté (${motif.slice(0, 110)})`);
  } else { erreurs++; console.log("sortie inattendue"); }
}

console.log(`\nBILAN — ${ok} qa_ok · ${rejetes} rejetés · ${erreurs} erreurs`);
console.log("Validation humaine : cockpit /contenu (publier = REMPLACER les steps de la leçon)");
