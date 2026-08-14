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

/**
 * Approuve TOUS les brouillons qa_ok d'un coup — et, en option, d'un seul
 * parcours (`pathId`) ou d'une seule langue (`locale`).
 *
 * Le gate humain n'est pas dilué : l'humain décide toujours, et seuls des
 * brouillons DÉJÀ passés par le QA automatique sont concernés. Ce qui
 * change, c'est l'ergonomie : un lot d'enrichissement produit des dizaines
 * de brouillons, et cliquer quarante fois n'est pas une validation plus
 * réfléchie — c'est juste une validation plus pénible.
 */
export async function approuverTousQaOk(formData: FormData) {
  const sql = getPromptlandiaDb();
  if (!sql) redirect("/contenu");
  const pathId = String(formData.get("pathId") ?? "");
  const locale = String(formData.get("locale") ?? "");

  const lignes = pathId
    ? await sql`update lesson_drafts set status = 'approved'
        where status = 'qa_ok' and path_id = ${pathId} returning id`
    : locale
      ? await sql`update lesson_drafts set status = 'approved'
          where status = 'qa_ok' and locale = ${locale} returning id`
      : await sql`update lesson_drafts set status = 'approved'
          where status = 'qa_ok' returning id`;

  redirect(`/contenu?fait=approuve_lot&n=${lignes.length}`);
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
 *  steps — les quiz et jeux restent dans steps, jamais dans le texte. */
function contenuDepuisSteps(steps: LessonStep[]): string {
  const blocs: string[] = [];
  for (const s of steps) {
    if (s.type === "text") blocs.push(s.content);
    else if (s.type === "tap_reveal") blocs.push(`> 💡 **Fun Fact:** ${s.reveal}`);
    else if (s.type === "try_it") blocs.push(`✏️ **Exercise:** ${s.instruction}`);
    // Jeux v2 : l'instruction seule passe dans le texte de secours —
    // jamais la solution (le player texte reste lisible sans spoiler).
    else if (s.type === "build_prompt" || s.type === "sort_order")
      blocs.push(`🎮 **Game:** ${s.instruction}`);
    else if (s.type === "fill_blank") blocs.push(`✏️ **Fill the blank:** ${s.sentence}`);
  }
  return blocs.join("\n\n");
}

// Publie TOUS les drafts approuvés. IDEMPOTENT : chaque draft est d'abord
// « réclamé » (update conditionné à status='approved') — un double clic ou
// un run concurrent ne réclame rien et n'insère donc rien deux fois ; un
// draft published ne repasse jamais dans lessons.
// Deux chemins :
// - draft normal            → INSERT d'une nouvelle leçon à la suite ;
// - draft d'ENRICHISSEMENT  → UPDATE : REMPLACE les steps (et le contenu
//   de secours) de la leçon d'origine (enriches_lesson_id). Qualité avant
//   quantité : une leçon fine ne se duplique pas, elle s'enrichit.
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
      returning id, path_id, title, steps, enriches_lesson_id, locale`) as {
      id: string;
      path_id: string;
      title: string;
      steps: LessonStep[];
      enriches_lesson_id: string | null;
      locale: string;
    }[];
    if (reclame.length === 0) continue; // déjà publié par un run concurrent

    const draft = reclame[0];

    if (draft.enriches_lesson_id) {
      // 2a · ENRICHISSEMENT : remplacer les steps de la leçon d'origine
      // (titre et order_index inchangés — même leçon, en mieux).
      const misesAJour = (await sql`
        update lessons
        set steps = ${JSON.stringify(draft.steps)},
            content = ${contenuDepuisSteps(draft.steps)}
        where id = ${draft.enriches_lesson_id}
        returning id`) as { id: string }[];
      if (misesAJour.length === 0) {
        // Leçon d'origine disparue : on rend le draft à la validation
        // humaine plutôt que d'inventer une insertion.
        await sql`update lesson_drafts set status = 'qa_rejected' where id = ${draft.id}`;
        continue;
      }
      await sql`update lesson_drafts set published_lesson_id = ${draft.enriches_lesson_id} where id = ${draft.id}`;
    } else {
      // 2b · Nouvelle leçon : order_index À LA SUITE du parcours, calculé
      // au moment de publier.
      const [{ prochain }] = (await sql`
        select coalesce(max(order_index), 0) + 1 as prochain
        from lessons where path_id = ${draft.path_id}`) as { prochain: number }[];
      const [lecon] = (await sql`
        insert into lessons (path_id, title, content, steps, order_index, locale)
        values (${draft.path_id}, ${draft.title}, ${contenuDepuisSteps(draft.steps)},
                ${JSON.stringify(draft.steps)}, ${prochain}, ${draft.locale})
        returning id`) as { id: string }[];
      // 3 · Traçabilité draft → leçon publiée.
      await sql`update lesson_drafts set published_lesson_id = ${lecon.id} where id = ${draft.id}`;
    }
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
