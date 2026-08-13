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
// PromptLandia (apps/expo/utils/learning.ts), v2 mini-jeux compris.
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
  | { type: "try_it"; instruction: string; example?: string }
  | {
      type: "build_prompt";
      instruction: string;
      chips: string[];
      correct_indices: number[];
      mode: "ordered" | "anyorder";
      explanation: string;
    }
  | {
      type: "sort_order";
      instruction: string;
      items: string[];
      correct_order: number[];
      explanation: string;
    }
  | {
      type: "fill_blank";
      sentence: string;
      options: string[];
      correct_index: number;
      explanation: string;
    };

export type QaReport = {
  version?: number;
  regles_code?: {
    ok?: boolean;
    erreurs?: string[];
    compte?: Record<string, number>;
  };
  // v2 : trace de la boucle qualité adversariale (critique → révision).
  critique_adversariale?: {
    interessant?: number;
    jeux?: number;
    narration?: number;
    reproches?: string[];
    revise?: boolean;
  };
  qa_ia?: {
    adapte_6_12?: number;
    factuel?: number;
    ton_positif?: number;
    anglais?: number;
    interessant?: number;
    narration?: number;
    jeux?: number;
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
  // v2 — mode enrichissement : id de la leçon publiée dont ce draft est
  // la version riche ; à la publication, ses steps sont REMPLACÉS
  // (update) au lieu d'insérer une nouvelle leçon.
  enriches_lesson_id: string | null;
  created_at: string | null;
};
