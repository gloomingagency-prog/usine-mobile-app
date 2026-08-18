"use client";

import { useState } from "react";

// FICHE D'IDENTITÉ de l'entité — avec un bouton de copie par ligne.
//
// Ce n'est pas un confort. Ces valeurs se recopient dans des formulaires
// (Dun & Bradstreet, Play Console, profil de paiement) où une variation
// d'un caractère fait échouer une vérification et coûte des jours. Les
// retaper à la main depuis un téléphone, c'est se garantir une faute de
// frappe ; les copier, c'est l'exclure.

type Ligne = { label: string; valeur: string; alerte?: boolean };

export function FicheEntite({ lignes, nom }: { lignes: Ligne[]; nom: string }) {
  const [copie, setCopie] = useState<string | null>(null);

  const copier = async (valeur: string, label: string) => {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(label);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      // Presse-papiers refusé : la valeur reste affichée en clair,
      // la sélection manuelle demeure possible.
    }
  };

  return (
    <section className="carte">
      <h2>Entité qui encaisse · {nom}</h2>
      <p className="meta">
        À recopier <strong>au caractère près</strong> dans chaque formulaire. Une
        variation, même minuscule, fait échouer une vérification et coûte des jours.
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {lignes.map((l) => (
          <div
            key={l.label}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              justifyContent: "space-between",
              paddingBottom: 10,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="id" style={{ marginBottom: 2 }}>
                {l.label}
              </div>
              <div
                style={{
                  wordBreak: "break-word",
                  color: l.alerte ? "#f59e0b" : undefined,
                  fontWeight: l.alerte ? 600 : undefined,
                }}
              >
                {l.valeur}
              </div>
            </div>
            {!l.alerte && (
              <button
                type="button"
                onClick={() => copier(l.valeur, l.label)}
                aria-label={`Copier ${l.label}`}
                style={{
                  flexShrink: 0,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent",
                  color: copie === l.label ? "#22c55e" : "rgba(255,255,255,0.65)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {copie === l.label ? "copié ✓" : "copier"}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
