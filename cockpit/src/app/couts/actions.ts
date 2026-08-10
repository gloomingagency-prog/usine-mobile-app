"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";

const KINDS = ["ia", "build", "store", "infra", "ads", "outils"] as const;
type Kind = (typeof KINDS)[number];

export async function listCosts() {
  const db = getDb();
  if (!db) return null;
  return db.select().from(schema.costs).orderBy(desc(schema.costs.at));
}

export async function addCost(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").replace(",", ".");
  const amount = Number.parseFloat(amountRaw);

  // Garde-fous par code : bornes explicites, pas de flottant en base.
  const kind = (KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as Kind) : null;
  if (!label || label.length > 120 || !kind || !Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    redirect("/couts?erreur=saisie");
  }

  const db = getDb();
  if (!db) redirect("/couts");
  await db.insert(schema.costs).values({
    id: randomUUID(),
    kind,
    label,
    amountCents: Math.round(amount * 100),
  });
  redirect("/couts?ajout=ok");
}
