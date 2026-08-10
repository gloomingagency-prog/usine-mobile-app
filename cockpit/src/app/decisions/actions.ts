"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DECISIONS_SEED } from "@/lib/decisions-seed";

async function ensureSeeded(db: NonNullable<ReturnType<typeof getDb>>) {
  const existing = await db.select({ id: schema.decisions.id }).from(schema.decisions);
  const known = new Set(existing.map((d) => d.id));
  const missing = DECISIONS_SEED.filter((d) => !known.has(d.id));
  if (missing.length > 0) {
    await db.insert(schema.decisions).values(
      missing.map((d) => ({
        id: d.id,
        titre: d.titre,
        detail: d.detail,
        proposition: d.proposition,
        statut: d.statut,
        commentaire: d.commentaire ?? null,
        decideLe: d.statut === "decidee" ? new Date() : null,
      })),
    );
  }
}

export async function listDecisions() {
  const db = getDb();
  if (!db) {
    return {
      source: "seed" as const,
      rows: DECISIONS_SEED.map((d) => ({ ...d, decideLe: null as Date | null })),
    };
  }
  await ensureSeeded(db);
  const rows = await db.select().from(schema.decisions).orderBy(schema.decisions.id);
  return {
    source: "db" as const,
    rows: rows.map((r) => ({
      id: r.id,
      titre: r.titre,
      detail: r.detail,
      proposition: r.proposition,
      statut: r.statut,
      commentaire: r.commentaire ?? undefined,
      decideLe: r.decideLe,
    })),
  };
}

export async function decide(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  const commentaire = String(formData.get("commentaire") ?? "").trim().slice(0, 500);
  if (!id || (verdict !== "validee" && verdict !== "refusee" && verdict !== "a_valider")) {
    return;
  }
  const db = getDb();
  if (!db) return; // base non configurée : l'UI l'affiche déjà
  await ensureSeeded(db);
  await db
    .update(schema.decisions)
    .set({
      statut: verdict,
      decideLe: verdict === "a_valider" ? null : new Date(),
      ...(commentaire ? { commentaire } : {}),
    })
    .where(eq(schema.decisions.id, id));
  redirect(`/decisions?fait=${encodeURIComponent(id)}&verdict=${verdict}`);
}
