"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const STATUTS = ["nouvelle", "a_analyser", "ecartee", "retenue"] as const;

export async function ajouterIdee(formData: FormData) {
  const titre = String(formData.get("titre") ?? "").trim().slice(0, 120);
  const categorie = String(formData.get("categorie") ?? "").trim().slice(0, 40) || "MANUELLE";
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 600);
  if (!titre) redirect("/idees?erreur=titre");
  const db = getDb();
  if (!db) redirect("/idees");
  const slug = titre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  // Les intuitions humaines suivent le MÊME circuit que les détections du
  // radar : même file, même gate de viabilité. Score neutre 50 (le gate
  // tranche, pas le score).
  await db
    .insert(schema.ideas)
    .values({
      id: `MANUELLE:${slug}`,
      categorie: categorie.toUpperCase(),
      appRef: "",
      titre,
      resume: notes || "Idée ajoutée à la main — à instruire au gate de viabilité.",
      metrics: { manuelle: true, notes },
      score: 50,
      status: "nouvelle",
    })
    .onConflictDoNothing();
  redirect("/idees?fait=ajout");
}

export async function trierIdee(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const statut = String(formData.get("statut") ?? "");
  if (!id || !(STATUTS as readonly string[]).includes(statut)) return;
  const db = getDb();
  if (!db) return;
  await db
    .update(schema.ideas)
    .set({ status: statut as (typeof STATUTS)[number] })
    .where(eq(schema.ideas.id, id));
  redirect(`/idees?fait=${encodeURIComponent(id)}`);
}
