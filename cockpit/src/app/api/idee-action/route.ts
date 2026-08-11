import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { verifierAction } from "@/lib/signature";

export const dynamic = "force-dynamic";

// Action sur une idée depuis un lien d'e-mail signé (hors Basic Auth).
// Transitions permises par ce canal — toutes réversibles depuis le
// cockpit : a_analyser (→ gate), ecartee, retenue (→ cadrage).
const STATUTS_PERMIS = ["a_analyser", "ecartee", "retenue"] as const;

function page(titre: string, corps: string, code = 200) {
  return new NextResponse(
    `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre}</title>
<body style="font-family:'Avenir Next','Segoe UI',system-ui,sans-serif;background:#F4F5F3;color:#1B2126;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="background:#fff;border:1px solid #DDE1DC;border-left:4px solid #0E7A6E;border-radius:8px;padding:24px 32px;max-width:480px">
<div style="font-weight:700;margin-bottom:8px">Usine<span style="color:#0E7A6E">·</span>Cockpit</div>
<p>${corps}</p>
<p><a href="https://usine-cockpit.vercel.app/idees" style="color:#0B5F56">Ouvrir la file d'idées</a></p>
</div></body></html>`,
    { status: code, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const id = q.get("id") ?? "";
  const statut = q.get("statut") ?? "";
  const exp = Number(q.get("exp"));
  const sig = q.get("sig") ?? "";

  if (!(STATUTS_PERMIS as readonly string[]).includes(statut) || !verifierAction(id, statut, exp, sig)) {
    return page("Lien invalide", "Ce lien d'action est invalide ou expiré.", 403);
  }
  const db = getDb();
  if (!db) return page("Indisponible", "Base non configurée.", 503);

  const rows = await db
    .update(schema.ideas)
    .set({ status: statut as (typeof STATUTS_PERMIS)[number] })
    .where(eq(schema.ideas.id, id))
    .returning({ titre: schema.ideas.titre });
  if (rows.length === 0) return page("Introuvable", "Idée introuvable.", 404);

  const libelle =
    statut === "a_analyser"
      ? "envoyée au gate de viabilité"
      : statut === "retenue"
        ? "retenue — direction le cadrage (étage 2)"
        : "écartée";
  return page("Fait", `« ${rows[0].titre} » ${libelle}.`);
}
