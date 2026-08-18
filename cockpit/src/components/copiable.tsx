"use client";

import { useState } from "react";

// VALEUR COPIABLE — le geste de base du cockpit sur téléphone.
//
// Tout ce qui figure ici finit recopié dans un formulaire tiers (Dun &
// Bradstreet, Play Console, App Store Connect, profil de paiement) où
// une variation d'un seul caractère fait échouer une vérification et
// coûte des jours d'attente. Sélectionner du texte au doigt sur un
// téléphone, c'est se garantir une faute de frappe ou une troncature.
//
// Le bouton n'est donc pas un confort : c'est ce qui rend la valeur
// utilisable là où elle sert.

export function Copiable({
  label,
  valeur,
  aide,
  alerte = false,
}: {
  label: string;
  valeur: string;
  /** Où et pourquoi cette valeur se colle. */
  aide?: string;
  /** Valeur pas encore disponible : on l'affiche sans bouton. */
  alerte?: boolean;
}) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : la valeur reste
      // affichée en clair, la sélection manuelle demeure possible.
    }
  };

  return (
    <div
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
          {label}
        </div>
        <div
          style={{
            wordBreak: "break-word",
            color: alerte ? "#f59e0b" : undefined,
            fontWeight: alerte ? 600 : undefined,
          }}
        >
          {valeur}
        </div>
        {aide && (
          <div className="meta" style={{ fontSize: 12, marginTop: 2 }}>
            {aide}
          </div>
        )}
      </div>
      {!alerte && (
        <button
          type="button"
          onClick={copier}
          aria-label={`Copier ${label}`}
          style={{
            flexShrink: 0,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "transparent",
            color: copie ? "#22c55e" : "rgba(255,255,255,0.65)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {copie ? "copié ✓" : "copier"}
        </button>
      )}
    </div>
  );
}

/** Bloc de valeurs copiables, avec un titre et une explication. */
export function BlocCopiable({
  titre,
  intro,
  valeurs,
}: {
  titre: string;
  intro?: string;
  valeurs: { label: string; valeur: string; aide?: string; alerte?: boolean }[];
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <h3 style={{ fontSize: "0.95rem", marginBottom: 4 }}>{titre}</h3>
      {intro && (
        <p className="meta" style={{ marginTop: 0, marginBottom: 12 }}>
          {intro}
        </p>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {valeurs.map((v) => (
          <Copiable key={v.label} {...v} />
        ))}
      </div>
    </div>
  );
}
