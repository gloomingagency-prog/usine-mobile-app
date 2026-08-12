import { neon } from "@neondatabase/serverless";

// Client DÉDIÉ à la base Neon PROMPTLANDIA (les brouillons de contenu
// vivent chez l'app, pas dans la base usine). Léger à dessein : requêtes
// SQL taguées, pas de schéma Drizzle — le cockpit ne fait que lire les
// drafts, les trier et publier vers `lessons` après validation humaine.
// Var d'env séparée : le DATABASE_URL du cockpit reste la base usine.
export function getPromptlandiaDb() {
  const url = process.env.PROMPTLANDIA_DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

// Étape de leçon interactive — miroir EXACT du type LessonStep de
// PromptLandia (apps/expo/utils/learning.ts).
export type LessonStep =
  | { type: "text"; content: string }
  | {
      type: "quiz";
      question: string;
      options: string[];
      correct_index: number;
      explanation: string;
    }
  | { type: "tap_reveal"; prompt: string; reveal: string }
  | { type: "try_it"; instruction: string };

export type QaReport = {
  regles_code?: {
    ok?: boolean;
    erreurs?: string[];
    compte?: Record<string, number>;
  };
  qa_ia?: {
    adapte_6_12?: number;
    factuel?: number;
    ton_positif?: number;
    anglais?: number;
    problemes?: string[];
  };
  verdict?: string;
  seuils?: string;
  modele?: string;
  genere_le?: string;
};

export type LessonDraft = {
  id: string;
  path_id: string;
  title: string;
  order_index: number;
  steps: LessonStep[];
  status: "draft" | "qa_ok" | "qa_rejected" | "approved" | "published";
  qa_report: QaReport | null;
  source: string;
  published_lesson_id: string | null;
  created_at: string | null;
};
