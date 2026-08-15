import type { Metadata, Viewport } from "next";
import { Sora, IBM_Plex_Sans } from "next/font/google";
import { count, eq, and, isNull } from "drizzle-orm";
import "./globals.css";
import { NavLinks } from "./nav-links";
import { getDb, schema } from "@/db";

const display = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Usine à apps — Cockpit",
  description: "Pilotage du portfolio d'apps mobiles : pipeline, décisions, coûts, docs.",
};

// SANS ceci, un navigateur mobile rend la page en largeur BUREAU puis
// dézoome : tout devient minuscule et les boutons intouchables. Le
// cockpit doit se piloter depuis un téléphone (validation de contenu,
// lien d'installation), c'est donc indispensable.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Ce qui ATTEND un humain, visible depuis toutes les pages.
async function fetchBadges(): Promise<Record<string, number>> {
  const db = getDb();
  if (!db) return {};
  try {
    const [ideesAAnalyser] = await db
      .select({ n: count() })
      .from(schema.ideas)
      .leftJoin(schema.viabilityReports, eq(schema.viabilityReports.ideaId, schema.ideas.id))
      .where(and(eq(schema.ideas.status, "a_analyser"), isNull(schema.viabilityReports.id)));
    const [dossiers] = await db
      .select({ n: count() })
      .from(schema.ideas)
      .innerJoin(schema.viabilityReports, eq(schema.viabilityReports.ideaId, schema.ideas.id))
      .where(eq(schema.ideas.status, "a_analyser"));
    const [decisionsAValider] = await db
      .select({ n: count() })
      .from(schema.decisions)
      .where(eq(schema.decisions.statut, "a_valider"));
    return {
      "/idees": (ideesAAnalyser?.n ?? 0) + (dossiers?.n ?? 0),
      "/decisions": decisionsAValider?.n ?? 0,
    };
  } catch {
    return {};
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const badges = await fetchBadges();
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="layout">
          <aside className="side">
            <div className="brand">
              Usine<span>·</span>Cockpit
            </div>
            <NavLinks badges={badges} />
            <div className="foot">
              L&apos;IA argumente, le CODE tranche,
              <br />
              l&apos;HUMAIN valide l&apos;argent.
            </div>
          </aside>
          <main className="shell">{children}</main>
        </div>
      </body>
    </html>
  );
}
