"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, schema } from "@/db";

type Maillon = { code: string; titre: string; fait: boolean };
type Meta = { repoUrl?: string; ideaId?: string; maillons?: Maillon[]; attentes?: { texte: string; qui: string; fait?: boolean }[] };

export async function basculerMaillon(formData: FormData) {
  const appId = String(formData.get("appId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!appId || !code) return;
  const db = getDb();
  if (!db) return;
  const rows = await db.select().from(schema.apps).where(eq(schema.apps.id, appId)).limit(1);
  if (rows.length === 0) return;
  const meta = (rows[0].meta ?? {}) as Meta;
  const maillon = (meta.maillons ?? []).find((m) => m.code === code);
  if (!maillon) return;
  maillon.fait = !maillon.fait;
  await db.update(schema.apps).set({ meta }).where(eq(schema.apps.id, appId));
  // Chaque transition importante = une ligne d'historique.
  await db.insert(schema.appEvents).values({
    id: randomUUID(),
    appId,
    fromStatus: null,
    toStatus: rows[0].status,
    actor: `maillon ${code} ${maillon.fait ? "FAIT" : "rouvert"} (humain)`,
  });
  redirect(`/apps/${encodeURIComponent(appId)}`);
}
