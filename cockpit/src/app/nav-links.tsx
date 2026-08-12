"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Synthèse" },
  { href: "/idees", label: "Idées" },
  { href: "/decisions", label: "Décisions" },
  { href: "/apps", label: "Portfolio" },
  { href: "/contenu", label: "Contenu" },
  { href: "/couts", label: "Coûts" },
  { href: "/docs", label: "Docs" },
  { href: "/statut", label: "Statut" },
];

export function NavLinks({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="main" aria-label="Navigation principale">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
        >
          {item.label}
          {(badges[item.href] ?? 0) > 0 && (
            <span className="navbadge">{badges[item.href]}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
