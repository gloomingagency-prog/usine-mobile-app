import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

// Webhook EAS Build (hors Basic Auth — signé HMAC-SHA1, fail-closed).
// À la fin d'un build : enregistre meta.lastBuild sur la fiche app et
// envoie l'e-mail avec le lien d'installation (gabarit charté).

const FROM = "Usine Cockpit <usine@croscel.com>";

async function envoyerEmail(sujet: string, corpsHtml: string) {
  const key = process.env.RESEND_API_KEY;
  const to = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!key || to.length === 0) return false;
  const html = `
  <div style="font-family:'Avenir Next','Segoe UI',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1B2126">
    <div style="font-weight:700;font-size:18px;margin-bottom:4px">Usine<span style="color:#0E7A6E">·</span>Cockpit</div>
    <div style="border-top:3px solid #0E7A6E;padding-top:16px">${corpsHtml}</div>
  </div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject: sujet, html }),
  });
  return r.ok;
}

export async function POST(req: NextRequest) {
  const secret = process.env.EAS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ erreur: "non configuré" }, { status: 503 });

  const brut = await req.text();
  const signature = req.headers.get("expo-signature") ?? "";
  const attendu = `sha1=${createHmac("sha1", secret).update(brut).digest("hex")}`;
  const a = Buffer.from(attendu);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ erreur: "signature invalide" }, { status: 401 });
  }

  const p = JSON.parse(brut) as {
    id?: string;
    projectName?: string;
    platform?: string;
    status?: string;
    artifacts?: { buildUrl?: string; applicationArchiveUrl?: string };
    buildDetailsPageUrl?: string;
    error?: { message?: string };
  };
  const appId = p.projectName ?? "";
  const db = getDb();
  if (db && appId) {
    const rows = await db.select().from(schema.apps).where(eq(schema.apps.id, appId)).limit(1);
    if (rows.length > 0) {
      const meta = (rows[0].meta ?? {}) as Record<string, unknown>;
      meta.lastBuild = {
        id: p.id,
        platform: p.platform,
        status: p.status,
        url: p.buildDetailsPageUrl,
        artifact: p.artifacts?.applicationArchiveUrl ?? p.artifacts?.buildUrl,
        at: new Date().toISOString(),
        erreur: p.error?.message ?? null,
      };
      await db.update(schema.apps).set({ meta }).where(eq(schema.apps.id, appId));
    }
  }

  const ok = p.status === "finished";
  const lien = p.artifacts?.applicationArchiveUrl ?? p.artifacts?.buildUrl ?? p.buildDetailsPageUrl ?? "";
  await envoyerEmail(
    ok ? `📱 Build ${appId} prêt à installer` : `🔴 Build ${appId} en échec`,
    ok
      ? `<p>Le build <b>${p.platform}</b> de <b>${appId}</b> est prêt.</p>
         <p><a href="${lien}" style="display:inline-block;background:#0E7A6E;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Installer sur le téléphone</a></p>
         <p style="color:#59636C;font-size:13px">Ouvre ce lien depuis l'appareil Android — il télécharge l'APK directement. Page du build : ${p.buildDetailsPageUrl ?? ""}</p>`
      : `<p>Le build <b>${p.platform}</b> de <b>${appId}</b> a échoué : ${p.error?.message ?? "voir les logs"}.</p><p>${p.buildDetailsPageUrl ?? ""}</p>`,
  );
  return NextResponse.json({ ok: true });
}
