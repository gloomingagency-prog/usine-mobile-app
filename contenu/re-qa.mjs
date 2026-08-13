// Re-évaluation déterministe des drafts rejetés sous les règles CODE
// courantes (compteur de phrases réparé, arbitrage text 2-6/jouables≥4,
// réparation mécanique). Un draft repasse qa_ok SSI : 0 erreur de règle
// code APRÈS réparation ET tous les scores IA déjà stockés ≥ 80. On ne
// régénère rien, on ne rappelle pas l'IA ; si la réparation a modifié
// les steps, la version réparée est PERSISTÉE (c'est elle qui a été
// jugée — publier autre chose serait mentir au validateur humain).
import { neon } from "@neondatabase/serverless";
import { qaRegleCode, reparerStructure } from "./regles.mjs";

const sql = neon(process.env.PROMPTLANDIA_DATABASE_URL ?? process.env.DATABASE_URL ?? "");
const drafts = await sql`select id, title, steps, qa_report from lesson_drafts where status = 'qa_rejected'`;
let flips = 0;
for (const d of drafts) {
  const { steps, reparations } = reparerStructure(d.steps);
  const regles = qaRegleCode({ title: d.title, steps }, []);
  const erreurs = regles.erreurs ?? [];
  const scores = d.qa_report?.qa_ia ?? {};
  const vals = Object.values(scores).filter((v) => typeof v === "number");
  const iaOk = vals.length > 0 && vals.every((v) => v >= 80);
  if (erreurs.length === 0 && iaOk) {
    const rapport = {
      ...d.qa_report,
      re_qa: {
        date: new Date().toISOString(),
        regles: "v2 + réparation mécanique (découpe text, retrait jeu secondaire en double)",
        reparations,
        erreurs_code: [],
        verdict: "qa_ok",
      },
    };
    await sql`update lesson_drafts set status = 'qa_ok', steps = ${JSON.stringify(steps)}::jsonb, qa_report = ${JSON.stringify(rapport)} where id = ${d.id}`;
    console.log("→ qa_ok:", d.id.slice(0, 8), d.title, reparations.length ? `| réparations: ${reparations.join(" ; ")}` : "");
    flips++;
  } else {
    console.log("  reste rejeté:", d.id.slice(0, 8), d.title, "| erreurs code:", erreurs.length, "| IA≥80:", iaOk);
  }
}
console.log(flips, "draft(s) repassé(s) qa_ok");
