"use server";

import { redirect } from "next/navigation";
import { getPromptlandiaDb, type LessonStep } from "@/db/promptlandia";

// Validation HUMAINE du contenu généré (pipeline contenu/ de l'usine).
// Ces actions n'écrivent que dans la base PROMPTLANDIA : lesson_drafts
// pour le tri, lessons UNIQUEMENT à la publication des drafts approuvés.

export async function approuverDraft(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const sql = getPromptlandiaDb();
  if (!id || !sql) redirect("/contenu");
  // Seul un draft qa_ok peut être approuvé — le QA automatique reste un
  // prérequis, l'humain ne « rattrape » pas un rejet sans relecture.
  await sql`update lesson_drafts set status = 'approved' where id = ${id} and status = 'qa_ok'`;
  redirect("/contenu?fait=approuve");
}

export async function rejeterDraft(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const sql = getPromptlandiaDb();
  if (!id || !sql) redirect("/contenu");
  await sql`update lesson_drafts set status = 'qa_rejected'
    where id = ${id} and status in ('qa_ok', 'approved')`;
  redirect("/contenu?fait=rejete");
}

/** Contenu markdown de secours (player texte) reconstruit depuis les
 *  steps — les quiz restent dans steps, jamais dans le texte. */
function contenuDepuisSteps(steps: LessonStep[]): string {
  const blocs: string[] = [];
  for (const s of steps) {
    if (s.type === "text") blocs.push(s.content);
    else if (s.type === "tap_reveal") blocs.push(`> 💡 **Fun Fact:** ${s.reveal}`);
    else if (s.type === "try_it") blocs.push(`✏️ **Exercise:** ${s.instruction}`);
  }
  return blocs.join("\n\n");
}

// Publie TOUS les drafts approuvés. IDEMPOTENT : chaque draft est d'abord
// « réclamé » (update conditionné à status='approved') — un double clic ou
// un run concurrent ne réclame rien et n'insère donc rien deux fois ; un
// draft published ne repasse jamais dans lessons.
export async function publierApprouves() {
  const sql = getPromptlandiaDb();
  if (!sql) redirect("/contenu");
  const approuves = (await sql`
    select id, path_id from lesson_drafts where status = 'approved'
    order by path_id, order_index, created_at`) as { id: string; path_id: string }[];

  let publies = 0;
  const pathsTouches = new Set<string>();
  for (const d of approuves) {
    // 1 · Réclamer le draft (verrou logique par statut).
    const reclame = (await sql`
      update lesson_drafts set status = 'published'
      where id = ${d.id} and status = 'approved'
      returning id, path_id, title, steps`) as {
      id: string;
      path_id: string;
      title: string;
      steps: LessonStep[];
    }[];
    if (reclame.length === 0) continue; // déjà publié par un run concurrent

    const draft = reclame[0];
    // 2 · order_index À LA SUITE du parcours, calculé au moment de publier.
    const [{ prochain }] = (await sql`
      select coalesce(max(order_index), 0) + 1 as prochain
      from lessons where path_id = ${draft.path_id}`) as { prochain: number }[];
    const [lecon] = (await sql`
      insert into lessons (path_id, title, content, steps, order_index)
      values (${draft.path_id}, ${draft.title}, ${contenuDepuisSteps(draft.steps)},
              ${JSON.stringify(draft.steps)}, ${prochain})
      returning id`) as { id: string }[];
    // 3 · Traçabilité draft → leçon publiée.
    await sql`update lesson_drafts set published_lesson_id = ${lecon.id} where id = ${draft.id}`;
    pathsTouches.add(draft.path_id);
    publies++;
  }

  // 4 · lesson_count des parcours touchés = compte RÉEL des leçons.
  for (const pathId of pathsTouches) {
    await sql`update learning_paths
      set lesson_count = (select count(*)::int from lessons where path_id = ${pathId})
      where id = ${pathId}`;
  }

  redirect(`/contenu?fait=publie&n=${publies}`);
}
