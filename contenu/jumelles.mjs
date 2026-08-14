// PARITÉ DES LANGUES — lot de génération des leçons jumelles.
// Pour chaque leçon publiée dans la langue SOURCE, écrit sa version dans
// la langue CIBLE (mode --twin du générateur : même histoire, mêmes jeux,
// rédaction native, QA complet). Rien n'est publié : tout part en
// brouillon, la validation reste humaine (cockpit /contenu).
//
// REPRENABLE : une jumelle déjà publiée ou déjà en attente est sautée —
// le lot se relance sans doublon ni coût. C'est indispensable : 40 leçons
// représentent des heures de génération, et un lot qui casse ne doit
// jamais tout refaire.
//
// Usage : SOURCE=en CIBLE=fr node jumelles.mjs [--path lp-1]
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

const SOURCE = process.env.SOURCE ?? "en";
const CIBLE = process.env.CIBLE ?? "fr";
const i = process.argv.indexOf("--path");
const PATH_FILTRE = i >= 0 ? process.argv[i + 1] : null;

const brutes = PATH_FILTRE
  ? await sql`select id, title, path_id, concept_key, steps from lessons
      where locale = ${SOURCE} and path_id = ${PATH_FILTRE} order by path_id, order_index`
  : await sql`select id, title, path_id, concept_key, steps from lessons
      where locale = ${SOURCE} order by path_id, order_index`;

// On ne jumelle QUE les leçons déjà JOUABLES (≥ 2 mini-jeux). Leçon
// apprise le 2026-08-14 : la jumelle reproduit fidèlement sa source, donc
// jumeler une leçon pauvre produit une leçon pauvre que notre propre QA
// rejette (7 rejets sur 7 sur la dimension « jeux »). On enrichit
// d'abord, on traduit ensuite.
const JEUX = ["build_prompt", "sort_order", "fill_blank"];
const lecons = brutes.filter((l) => {
  const t = Array.isArray(l.steps) ? l.steps.map((s) => s?.type) : [];
  return t.filter((x) => JEUX.includes(x)).length >= 2;
});

console.log(
  `${brutes.length} leçon(s) « ${SOURCE} » · ${lecons.length} jouable(s) à jumeler en « ${CIBLE} » ` +
    `(${brutes.length - lecons.length} encore à enrichir, ignorée(s))\n`,
);

/** Lance le générateur en sous-processus : un plantage sur UNE leçon ne
 *  doit pas emporter le lot entier. */
function genererJumelle(id) {
  return new Promise((resolve) => {
    const p = spawn(
      process.execPath,
      [join(ICI, "index.mjs"), "--twin", id, "--locale", CIBLE],
      {
        env: {
          ...process.env,
          PROMPTLANDIA_DATABASE_URL: DB_URL,
          DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? env.DEEPSEEK_API_KEY ?? "",
        },
      },
    );
    let sortie = "";
    p.stdout.on("data", (d) => (sortie += d));
    p.stderr.on("data", (d) => (sortie += d));
    p.on("close", (code) => resolve({ code, sortie }));
  });
}

let ok = 0, rejetes = 0, sautes = 0, erreurs = 0;
for (const [n, l] of lecons.entries()) {
  process.stdout.write(`[${n + 1}/${lecons.length}] ${l.concept_key} … `);
  const { code, sortie } = await genererJumelle(l.id);
  if (sortie.includes("déjà fait")) { sautes++; console.log("déjà fait"); }
  else if (code !== 0) { erreurs++; console.log(`ERREUR\n${sortie.split("\n").slice(-4).join("\n")}`); }
  else if (/→ qa_ok/.test(sortie)) { ok++; console.log("qa_ok ✓"); }
  else if (/→ qa_rejected/.test(sortie)) {
    rejetes++;
    const motif = sortie.match(/ {2}erreurs: (.+)/)?.[1] ?? "scores IA sous le seuil";
    console.log(`rejeté (${motif.slice(0, 120)})`);
  } else { erreurs++; console.log("sortie inattendue"); }
}

console.log(`\nBILAN — ${ok} qa_ok · ${rejetes} rejetés · ${sautes} déjà faits · ${erreurs} erreurs`);
console.log("Validation humaine : cockpit /contenu");
