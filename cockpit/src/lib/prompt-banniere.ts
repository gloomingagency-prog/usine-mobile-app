// PROMPT DE BANNIÈRE — un par app, DÉDUIT de sa fiche.
//
// La bannière de la fiche store (1024 × 500) est le seul visuel qu'aucune
// capture d'écran ne peut produire : c'est du graphisme. Le propriétaire
// la génère lui-même, une fois par app, dans un abonnement IA qu'il
// possède déjà — donc sans aucun coût d'API.
//
// Pourquoi ici et pas dans le dépôt de l'app : l'usine produit un
// PORTFOLIO. Un prompt figé dans un dépôt serait recopié à la main d'une
// app à l'autre, et faux dès la deuxième. L'identité de chaque app vit
// dans sa fiche (`apps.meta.identite`), le prompt s'en déduit, et il se
// lit là où le propriétaire travaille — le cockpit, y compris depuis son
// téléphone.
//
// Rien n'est stocké : le prompt est recalculé à chaque affichage. Changer
// la promesse d'une app, c'est changer son prompt, sans rien à
// resynchroniser.

/** Identité éditoriale et visuelle d'une app — bloc `meta.identite`. */
export type IdentiteApp = {
  /** Ce que l'app permet de faire, en une phrase, sans jargon. */
  promesse?: string;
  /** À qui elle s'adresse. */
  public?: string;
  /** Le ton : ce qu'on veut ressentir, et ce qu'on refuse. */
  ton?: string;
  /** Couleurs du thème, en hexadécimal. */
  couleurs?: { fond?: string; primaire?: string; secondaire?: string; tertiaire?: string };
  /** Images mentales fidèles à l'app (2-3 suffisent sur une bannière). */
  motifs?: string[];
  /** Clichés et pièges à écarter explicitement. */
  aEviter?: string[];
};

/** Pièges communs à TOUTES les bannières de store, quelle que soit l'app. */
const A_EVITER_TOUJOURS = [
  "des logos ou marques existantes",
  "un slogan, une accroche ou du texte en petit — la boutique affiche déjà le titre et la description sous l'image",
  "un cadre, une bordure ou des coins arrondis : la boutique rogne l'image",
];

/**
 * Construit le prompt à coller dans un générateur d'images.
 *
 * `nom` vient de la fiche ; tout le reste de `identite`. Les champs
 * absents sont simplement omis plutôt que remplacés par une valeur
 * inventée : un prompt incomplet se corrige, un prompt qui ment produit
 * une bannière hors sujet.
 */
export function promptBanniere(nom: string, identite: IdentiteApp = {}): string {
  const c = identite.couleurs ?? {};
  const morceaux: string[] = [];

  morceaux.push(
    `Crée une bannière promotionnelle pour la fiche Google Play de l'application mobile « ${nom} ».`,
  );

  morceaux.push(
    [
      "FORMAT — impératif, la boutique refuse tout autre format :",
      "• 1024 pixels de large sur 500 pixels de haut, exactement",
      "• format paysage, PNG ou JPEG 24 bits, sans transparence",
      "• garde une marge de sécurité d'environ 100 px à gauche et à droite : la boutique recadre les côtés sur certains écrans, tout élément important doit rester au centre",
    ].join("\n"),
  );

  if (identite.promesse || identite.public) {
    const lignes = ["SUJET DE L'APPLICATION :"];
    if (identite.promesse) lignes.push(`${nom} sert à ${identite.promesse}.`);
    if (identite.public) lignes.push(`Elle s'adresse à ${identite.public}.`);
    morceaux.push(lignes.join("\n"));
  }

  const ambiance = ["AMBIANCE VISUELLE :"];
  if (c.fond) ambiance.push(`• Fond : ${c.fond}, avec une lueur diffuse.`);
  if (c.primaire) ambiance.push(`• Couleur dominante : ${c.primaire}.`);
  const secondaires = [c.secondaire, c.tertiaire].filter(Boolean);
  if (secondaires.length > 0) {
    ambiance.push(`• Touches secondaires : ${secondaires.join(" et ")}, en dégradés doux.`);
  }
  if (identite.ton) ambiance.push(`• Ton : ${identite.ton}.`);
  ambiance.push(
    "• Style : illustration vectorielle moderne, formes simples, aplats de couleur et dégradés lumineux. Pas de photographie, pas de rendu 3D réaliste.",
  );
  if (ambiance.length > 1) morceaux.push(ambiance.join("\n"));

  if (identite.motifs && identite.motifs.length > 0) {
    morceaux.push(
      [
        "CE QUE L'IMAGE DOIT ÉVOQUER — choisis-en deux ou trois, pas davantage :",
        ...identite.motifs.map((m) => `• ${m}`),
      ].join("\n"),
    );
  }

  morceaux.push(
    [
      "TEXTE DANS L'IMAGE :",
      `• Uniquement le nom « ${nom} », en gros, à gauche ou au centre-gauche.`,
      "• Typographie sans empattement, arrondie, généreuse, lisible de loin.",
    ].join("\n"),
  );

  morceaux.push(
    [
      "À ÉVITER ABSOLUMENT :",
      ...[...(identite.aEviter ?? []), ...A_EVITER_TOUJOURS].map((m) => `• ${m}`),
    ].join("\n"),
  );

  morceaux.push(
    [
      "COMPOSITION :",
      "Le nom occupe la moitié gauche. L'illustration occupe la moitié droite et respire — beaucoup de fond visible, peu d'éléments. Une bannière de boutique est vue en quelques dixièmes de seconde sur un écran de téléphone : elle doit se lire de loin.",
    ].join("\n"),
  );

  return morceaux.join("\n\n");
}

/** Ce qui manque encore pour que le prompt soit vraiment utilisable. */
export function manquesIdentite(identite: IdentiteApp = {}): string[] {
  const manques: string[] = [];
  if (!identite.promesse) manques.push("la promesse (ce que l'app permet de faire)");
  if (!identite.public) manques.push("le public visé");
  if (!identite.couleurs?.primaire) manques.push("la couleur dominante");
  if (!identite.motifs || identite.motifs.length === 0) manques.push("les motifs à évoquer");
  return manques;
}
