import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Usine à apps — Cockpit",
  description: "Pilotage du portfolio d'apps mobiles : pipeline, décisions, docs.",
};

const NAV = [
  { href: "/", label: "Synthèse" },
  { href: "/decisions", label: "Décisions" },
  { href: "/apps", label: "Portfolio" },
  { href: "/docs", label: "Docs" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="top">
          <div className="inner">
            <div className="brand">
              Usine<span>·</span>Cockpit
            </div>
            <nav className="main" aria-label="Navigation principale">
              {NAV.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
