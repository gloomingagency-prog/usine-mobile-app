"use client";

import { useState } from "react";

// Bloc « bannière » de la fiche app : le prompt à coller, et un bouton
// qui le copie. Composant CLIENT uniquement pour le presse-papiers —
// le prompt lui-même est calculé côté serveur à partir de la fiche.
//
// Le propriétaire consulte le cockpit depuis son téléphone : le bouton
// « copier » n'est pas un confort, c'est le seul geste praticable là-bas
// (sélectionner trente lignes de texte au doigt ne l'est pas).

export function BlocBanniere({ prompt, manques }: { prompt: string; manques: string[] }) {
  const [copie, setCopie] = useState(false);
  const [ouvert, setOuvert] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, permission) : on
      // déplie le texte pour que la copie manuelle reste possible.
      setOuvert(true);
    }
  };

  return (
    <section className="carte">
      <h2>Bannière de la fiche store</h2>
      <p className="meta">
        1024 × 500 · le seul visuel qu&apos;aucune capture ne peut produire. Copiez ce
        prompt dans un générateur d&apos;images, une fois pour cette app.
      </p>

      {manques.length > 0 && (
        <p className="danger" style={{ marginTop: 8 }}>
          Identité incomplète — le prompt sera vague tant qu&apos;il manque : {manques.join(", ")}.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button type="button" className="primary" onClick={copier}>
          {copie ? "Copié ✓" : "Copier le prompt"}
        </button>
        <button type="button" onClick={() => setOuvert((o) => !o)}>
          {ouvert ? "Masquer" : "Voir le texte"}
        </button>
      </div>

      {ouvert && (
        <pre
          style={{
            marginTop: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {prompt}
        </pre>
      )}
    </section>
  );
}
