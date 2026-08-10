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
        <header className="top">
          <div className="inner">
            <div className="brand">
              Usine<span>·</span>Cockpit
            </div>
            <NavLinks />
          </div>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
