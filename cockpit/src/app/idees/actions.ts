"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const STATUTS = ["nouvelle", "a_analyser", "ecartee", "retenue"] as const;

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
