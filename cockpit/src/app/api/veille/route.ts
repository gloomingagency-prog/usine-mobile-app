import { NextRequest, NextResponse } from "next/server";
import { desc, gt, and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

// Veille quotidienne (cron Vercel — volontairement HORS du VPS : le
// surveillant ne partage jamais le chemin mort des surveillés).
// 1. Cron silencieux > 2× sa cadence = PANNE → e-mail critique.
// 2. Idées fortes (score ≥ 50) des dernières 24 h → digest.
// Déduplication par l'id de l'alerte (une alerte ne part qu'une fois).

const FROM = "Usine Cockpit <usine@croscel.com>";

async function envoyerEmail(sujet: string, corpsHtml: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!key || to.length === 0) return false;
  // Gabarit charté unique — jamais de HTML brut disparate par canal.
  const html = `
  <div style="font-family:'Avenir Next','Segoe UI',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1B2126">
    <div style="font-weight:700;font-size:18px;margin-bottom:4px">Usine<span style="color:#0E7A6E">·</span>Cockpit</div>
    <div style="border-top:3px solid #0E7A6E;padding-top:16px">${corpsHtml}</div>
    <p style="color:#59636C;font-size:12px;margin-top:24px">
      Statut public : https://usine-cockpit.vercel.app/statut — cet e-mail est envoyé par la veille quotidienne.
    </p>
  </div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject: sujet, html }),
  });
  return r.ok;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "non autorisé" }, { status: 401 });
  }
  const db = getDb();
  if (!db) return NextResponse.json({ erreur: "base non configurée" }, { status: 503 });

  const jour = new Date().toISOString().slice(0, 10);
  const nouvelles: { id: string; severity: string; message: string }[] = [];

  // Insère une alerte si inédite (l'id déduplique) ; renvoie true si inédite.
  async function alerter(id: string, severity: "info" | "critical", source: string, message: string) {
    const inserted = await db!
      .insert(schema.alerts)
      .values({ id, severity, source, message })
      .onConflictDoNothing()
      .returning({ id: schema.alerts.id });
    if (inserted.length > 0) nouvelles.push({ id, severity, message });
  }

  // 1 · Crons silencieux
  const hbs = await db
    .select()
    .from(schema.cronHeartbeats)
    .orderBy(desc(schema.cronHeartbeats.startedAt))
    .limit(500);
  const vus = new Set<string>();
  for (const h of hbs) {
    if (vus.has(h.job)) continue;
    vus.add(h.job);
    const dernier = (h.finishedAt ?? h.startedAt).getTime();
    const cadence = (h.expectedEverySec ?? 86400) * 1000;
    if (Date.now() - dernier > 2 * cadence) {
      const heures = Math.round((Date.now() - dernier) / 3600000);
      await alerter(
        `silencieux:${h.job}:${jour}`,
        "critical",
        h.job,
        `Le cron « ${h.job} » est silencieux depuis ${heures} h (cadence attendue : ${Math.round(cadence / 3600000)} h). Un silence > 2× la cadence est une PANNE, pas un retard.`,
      );
    }
    if (h.status === "error" && vus.size <= 20) {
      await alerter(
        `erreur:${h.job}:${h.id}`,
        "critical",
        h.job,
        `Dernier passage du cron « ${h.job} » en ERREUR : ${h.note ?? "sans détail"}.`,
      );
    }
  }

  // 2 · Idées fortes des dernières 24 h
  const depuis = new Date(Date.now() - 24 * 3600 * 1000);
  const fortes = await db
    .select()
    .from(schema.ideas)
    .where(and(gt(schema.ideas.seenAt, depuis), eq(schema.ideas.status, "nouvelle"), gt(schema.ideas.score, 49)))
    .orderBy(desc(schema.ideas.score))
    .limit(10);
  if (fortes.length > 0) {
    const liste = fortes.map((i) => `• [${i.score}] ${i.titre} (${i.categorie})`).join("<br/>");
    await alerter(
      `idees:${jour}`,
      "info",
      "radar",
      `${fortes.length} idée(s) à score ≥ 50 détectée(s) :<br/>${liste}<br/>À trier : https://usine-cockpit.vercel.app/idees`,
    );
  }

  // Test de plomberie explicite (?test=1) — jamais silencieux
  if (req.nextUrl.searchParams.get("test") === "1") {
    nouvelles.push({ id: "test", severity: "info", message: "E-mail de test de la veille — la plomberie fonctionne." });
  }

  let emailEnvoye = false;
  if (nouvelles.length > 0) {
    const critiques = nouvelles.filter((n) => n.severity === "critical");
    const sujet = critiques.length > 0 ? `🔴 Usine : ${critiques.length} panne(s) détectée(s)` : `Usine : ${nouvelles.length} info(s) de veille`;
    const corps = nouvelles
      .map((n) => `<p style="border-left:3px solid ${n.severity === "critical" ? "#B3372F" : "#0E7A6E"};padding-left:12px">${n.message}</p>`)
      .join("");
    emailEnvoye = await envoyerEmail(sujet, corps);
  }

  return NextResponse.json({ alertes_nouvelles: nouvelles.length, email: emailEnvoye });
}
