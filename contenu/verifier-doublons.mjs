#!/usr/bin/env node
// DÉTECTION DES DOUBLONS DE LEÇONS — quatre angles, parce qu'un seul
// laisse passer.
//
// Incident 2026-08-18 : deux leçons françaises racontaient la MÊME
// histoire (le détective des métiers du futur, en 2030) dans le même
// parcours. La détection par `concept_key` ne pouvait pas les voir :
// l'une portait une clé dérivée du titre FRANÇAIS, donc différente de
// celle de sa jumelle anglaise. Un doublon qui ne partage pas sa clé
// reste un doublon pour l'enfant, qui refait la même leçon.
//
// D'où quatre angles complémentaires :
//   1. même concept publié deux fois dans une langue ;
//   2. titres identiques dans un parcours ;
//   3. titres très proches (doublons déguisés par une variante) ;
//   4. CONTENU proche — le seul qui attrape le cas ci-dessus.
//
// Angle 5, préventif : une leçon d'une langue traduite sans jumelle
// dans l'autre trahit une clé mal dérivée. C'est le signe précoce.
//
// Usage : node verifier-doublons.mjs   (sort en code 1 s'il en trouve)
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.PROMPTLANDIA_DATABASE_URL ?? process.env.DATABASE_URL ?? "");

const norm = (t) =>
  (t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const mots = (t, min) => new Set(norm(t).split(" ").filter((m) => m.length > min));
const jaccard = (a, b) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 0;
};
const texteDe = (steps) =>
  (typeof steps === "string" ? JSON.parse(steps) : steps ?? [])
    .map((s) => [s.content, s.question, s.prompt, s.instruction, s.sentence].filter(Boolean).join(" "))
    .join(" ");

const lecons = await sql`select id, path_id, locale, title, order_index, concept_key, steps
                         from lessons order by path_id, order_index`;
let problemes = 0;
const signaler = (quoi) => { console.log("  ⚠", quoi); problemes++; };

console.log(`${lecons.length} leçons\n`);

console.log("1. Même concept publié plusieurs fois dans une langue");
for (const r of await sql`select locale, concept_key, count(*) n, string_agg(title,' | ') t
                          from lessons group by locale, concept_key having count(*) > 1`) {
  signaler(`[${r.locale}] ${r.concept_key} ×${r.n} — ${r.t}`);
}

console.log("2. Titres identiques dans un parcours");
for (const r of await sql`select path_id, title, count(*) n from lessons
                          group by path_id, title having count(*) > 1`) {
  signaler(`${r.path_id} « ${r.title} » ×${r.n}`);
}

console.log("3. Titres très proches dans un parcours");
for (let i = 0; i < lecons.length; i++) {
  for (let j = i + 1; j < lecons.length; j++) {
    const a = lecons[i], b = lecons[j];
    if (a.path_id !== b.path_id) continue;
    const s = jaccard(mots(a.title, 3), mots(b.title, 3));
    if (s >= 0.5) signaler(`${a.path_id} ${Math.round(s * 100)}% — « ${a.title} » ≈ « ${b.title} »`);
  }
}

console.log("4. Contenu proche dans un parcours");
for (let i = 0; i < lecons.length; i++) {
  for (let j = i + 1; j < lecons.length; j++) {
    const a = lecons[i], b = lecons[j];
    if (a.path_id !== b.path_id) continue;
    const s = jaccard(mots(texteDe(a.steps), 4), mots(texteDe(b.steps), 4));
    if (s >= 0.35) signaler(`${a.path_id} ${Math.round(s * 100)}% — « ${a.title} » ≈ « ${b.title} »`);
  }
}

console.log("5. Leçons sans jumelle dans l'autre langue (clé mal dérivée)");
for (const loc of ["fr", "en"]) {
  const autre = loc === "fr" ? "en" : "fr";
  for (const r of await sql`select path_id, title, concept_key from lessons l
      where l.locale = ${loc} and not exists (
        select 1 from lessons o where o.locale = ${autre} and o.concept_key = l.concept_key)`) {
    // Sans jumelle ≠ doublon : c'est un signal, pas un verdict. Un
    // concept peut n'exister que dans une langue, volontairement.
    console.log(`  · [${loc}] ${r.path_id} « ${r.title} » (${r.concept_key})`);
  }
}

console.log(problemes === 0 ? "\n✔ Aucun doublon." : `\n✗ ${problemes} doublon(s) à traiter.`);
process.exit(problemes === 0 ? 0 : 1);
