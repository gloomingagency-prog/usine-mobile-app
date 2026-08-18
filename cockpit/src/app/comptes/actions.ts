"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { EtapeProcedure } from "@/lib/procedures-seed";

/**
 * Coche ou décoche une étape de démarche.
 *
 * Volontairement réversible : une étape se rouvre. Une case qu'on ne
 * peut plus décocher pousse à mentir plutôt qu'à corriger.
 */
export async function basculerEtape(formData: FormData) {
  const procedureId = String(formData.get("procedureId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!procedureId || !code) return;

  const db = getDb();
  if (!db) return;
  const rows = await db
    .select()
    .from(schema.procedures)
    .where(eq(schema.procedures.id, procedureId))
    .limit(1);
  if (rows.length === 0) return;

  const etapes = (rows[0].etapes ?? []) as EtapeProcedure[];
  const etape = etapes.find((e) => e.code === code);
  if (!etape) return;
  etape.fait = !etape.fait;

  await db
    .update(schema.procedures)
    .set({ etapes })
    .where(eq(schema.procedures.id, procedureId));
  redirect("/comptes");
}
