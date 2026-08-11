// Seed des décisions de cadrage (source : docs/planning/CADRAGE_USINE.md).
// À l'initialisation de la base, ces lignes sont upsertées par id ; le
// statut en base fait ensuite foi (les décisions se prennent au cockpit).

export type DecisionSeed = {
  id: string;
  titre: string;
  detail: string;
  proposition: string;
  statut: "a_valider" | "validee" | "refusee" | "decidee";
  commentaire?: string;
};

export const DECISIONS_SEED: DecisionSeed[] = [
  {
    id: "D1",
    titre: "Modèle business",
    detail:
      "Portfolio d'apps propres, usine-service pour clients, ou usine-produit SaaS ?",
    proposition:
      "Portfolio propre d'abord — chaque app est une hypothèse ; l'usine-service (V2) est de toute façon contrainte par Apple 4.2.6 (chaque client publie sous son propre compte).",
    statut: "a_valider",
  },
  {
    id: "D2",
    titre: "Comptes développeur",
    detail:
      "Ordre et nature des comptes stores. Un compte Google organisation (D-U-N-S) échappe à la règle des 12 testeurs/14 jours.",
    proposition:
      "Google d'abord (organisation + D-U-N-S), Apple dans un second temps. Première app Android d'abord. Jamais de comptes multiples (ban par association).",
    statut: "decidee",
    commentaire: "Décidé par l'utilisateur le 2026-08-10.",
  },
  {
    id: "D3",
    titre: "Structure de code",
    detail: "Monorepo usine et repos d'apps.",
    proposition:
      "Monorepo usine (cockpit + châssis + packages partagés) ; un repo par app généré depuis le châssis — une app reste jetable/vendable individuellement.",
    statut: "a_valider",
  },
  {
    id: "D4",
    titre: "Backend des apps",
    detail: "Où vivent les données produit de chaque app du portfolio.",
    proposition:
      "Local-first sans backend par défaut (coût ≈ 0, offline parfait) ; sinon un backend isolé par app (Neon : 100 projets en free). Jamais le backend de l'usine.",
    statut: "decidee",
    commentaire: "Cohérent avec le choix Neon — tranché au cadrage 2026-08-10.",
  },
  {
    id: "D4bis",
    titre: "Stack du cockpit",
    detail: "Framework et base du dashboard d'administration.",
    proposition: "Next.js + Neon, déployé sur Vercel ; base accédée uniquement côté serveur.",
    statut: "decidee",
    commentaire: "Décidé par l'utilisateur le 2026-08-10.",
  },
  {
    id: "D4ter",
    titre: "Framework des apps",
    detail: "React Native/Expo, Flutter, ou émergents (veille du 2026-08-10 dans ANALYSE_MARCHE.md).",
    proposition:
      "React Native + Expo : codegen IA supérieur en TS, OTA conforme Apple 3.3.1(B), EAS multi-projets, expo-updates self-hostable. Réserve : Flutter + Shorebird.",
    statut: "decidee",
    commentaire: "Choix délégué par l'utilisateur, tranché sur veille.",
  },
  {
    id: "D5",
    titre: "Orchestrateur des workflows",
    detail: "Moteur des pipelines longs (retries, gates humains).",
    proposition:
      "n8n seul d'abord (VPS existant, gates via les files « À traiter » en base) ; Inngest seulement si les pipelines longs le réclament — commencer au niveau le plus bas qui marche.",
    statut: "a_valider",
  },
  {
    id: "D6",
    titre: "Périmètre du radar",
    detail:
      "Directive utilisateur (2026-08-11) : ne PAS se limiter aux niches utilitaires — jeux, applis d'apprentissage, formations, éducation ludique, tout est ouvert. Le radar mine large, le gate de viabilité filtre.",
    proposition:
      "Radar v1 sur un spectre large (éducation, jeux éducatifs/casual, santé-habitudes, parentalité, productivité verticale…) ; la short-list documentée sortira des données du radar, pas d'une intuition.",
    statut: "validee",
    commentaire: "Validée par l'utilisateur le 2026-08-11 : spectre large confirmé.",
  },
  {
    id: "D9",
    titre: "Composition du portefeuille",
    detail:
      "Doctrine du 2026-08-11 (DOCTRINE_PORTEFEUILLE.md) : objectif = faire percer une app ; archétypes compounding / cash / loterie avec critères de gate adaptés.",
    proposition:
      "~70 % compounding · ~20 % cash · ~10 % loterie, révisable sur données. Premières apps du compte : jamais une loterie.",
    statut: "validee",
    commentaire: "Confiance déléguée par l'utilisateur (2026-08-11).",
  },
  {
    id: "D7",
    titre: "Budget",
    detail: "Plafond de dépenses par app et pour l'usine.",
    proposition:
      "Première app ≤ 50-100 $ hors comptes développeur ; marketing uniquement sur dossier chiffré validé (gate argent). Tokens IA suivis par app dans le cockpit.",
    statut: "decidee",
    commentaire: "Décidé par l'utilisateur le 2026-08-10.",
  },
  {
    id: "D8",
    titre: "Appareil de référence",
    detail:
      "Le téléphone bas de gamme sur lequel chaque maillon est testé en réel (le simulateur ment).",
    proposition: "Un Android ~200 € (+ un iPhone quand le compte Apple arrivera).",
    statut: "a_valider",
  },
];
