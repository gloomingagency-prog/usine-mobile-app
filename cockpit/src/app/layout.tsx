import type { Metadata } from "next";
import "./globals.css";
import { NavLinks } from "./nav-links";

export const metadata: Metadata = {
  title: "Usine à apps — Cockpit",
  description: "Pilotage du portfolio d'apps mobiles : pipeline, décisions, coûts, docs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="layout">
          <aside className="side">
            <div className="brand">
              Usine<span>·</span>Cockpit
            </div>
            <NavLinks />
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
