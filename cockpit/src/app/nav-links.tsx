"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// NAVIGATION — groupée par ce qu'on VIENT Y FAIRE.
//
// Avant : neuf liens à plat, sans hiérarchie. « Comptes » ne disait pas
// qu'on y trouvait l'entité juridique, et il fallait demander où était
// l'information — le signe qu'une navigation ne fait pas son travail.
//
// Trois groupes, dans l'ordre du travail réel : ce qu'on décide, ce
// qu'on produit, ce qui encadre. Chaque lien porte une phrase qui dit à
// quoi sert la page ; elle s'affiche au survol sur ordinateur et sert de
// libellé d'accessibilité partout.

type Lien = { href: string; label: string; quoi: string };

const GROUPES: { titre: string; liens: Lien[] }[] = [
  {
    titre: "Piloter",
    liens: [
      { href: "/", label: "Synthèse", quoi: "Ce qui attend une décision, tout de suite" },
      { href: "/statut", label: "Statut", quoi: "Santé des automatismes et des crons" },
    ],
  },
  {
    titre: "Décider",
    liens: [
      { href: "/idees", label: "Idées", quoi: "Opportunités détectées et dossiers de viabilité" },
      { href: "/decisions", label: "Décisions", quoi: "Arbitrages actés, et ceux qui attendent" },
    ],
  },
  {
    titre: "Produire",
    liens: [
      { href: "/apps", label: "Portfolio", quoi: "Les apps, leur avancement, leurs fiches" },
      { href: "/contenu", label: "Contenu", quoi: "Leçons à valider avant publication" },
    ],
  },
  {
    titre: "Encadrer",
    liens: [
      {
        href: "/comptes",
        label: "Entité & comptes",
        quoi: "Marnwell LLC, comptes développeur Google et Apple",
      },
      { href: "/couts", label: "Coûts", quoi: "Dépenses réelles, par app et pour l'usine" },
      { href: "/docs", label: "Docs", quoi: "Cadrage, architecture, analyse de marché" },
    ],
  },
];

export function NavLinks({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="main" aria-label="Navigation principale">
      {GROUPES.map((g) => (
        <div key={g.titre} className="navgroupe">
          <div className="navtitre">{g.titre}</div>
          {g.liens.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.quoi}
              aria-label={`${item.label} — ${item.quoi}`}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
              {(badges[item.href] ?? 0) > 0 && (
                <span className="navbadge">{badges[item.href]}</span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
