// Pipeline contenu v2 — QUALITÉ D'ABORD. Génération de brouillons de
// leçons RICHES pour les apps du portfolio (PromptLandia) : narration
// continue + mini-jeux (build_prompt, sort_order, fill_blank), boucle
// qualité ADVERSARIALE (pattern gate : rédaction → critique IA exigeante
// → révision → QA final code + contre-lecture IA, seuils à 80). Une
// leçon qui ne passe pas est REJETÉE, pas rabotée.
// L'IA RÉDIGE EN AMONT, le CODE tranche (verdicts par seuils explicites,
// mélange des chips et calcul des indices PAR CODE — jamais confiés au
// modèle), l'HUMAIN valide dans le cockpit (/contenu). Ce script n'écrit
// QUE dans `lesson_drafts` (base Neon PROMPTLANDIA), jamais dans `lessons`.
//
// Usage :
//   node index.mjs --path lp-5 [--count 1]     nouvelle(s) leçon(s)
//   node index.mjs --enrich <lesson_id>        v2 RICHE d'une leçon publiée
//     (le draft porte enriches_lesson_id : à la publication, le cockpit
//      REMPLACE les steps de la leçon d'origine au lieu d'insérer)
// Env : PROMPTLANDIA_DATABASE_URL + DEEPSEEK_API_KEY (sinon lus dans
// ../cockpit/.env — append-only, la DERNIÈRE occurrence fait foi).

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// --- Env : process.env d'abord, sinon cockpit/.env (dernière occurrence).
function chargerEnvCockpit() {
  const vars = {};
  try {
    const brut = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "cockpit", ".env"),
      "utf8",
    );
    for (const ligne of brut.split("\n")) {
      const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) vars[m[1]] = m[2]; // la dernière occurrence écrase la première
    }
  } catch { /* pas de .env local : les env vars doivent suffire */ }
  return vars;
}
const envCockpit = chargerEnvCockpit();
const DB_URL = process.env.PROMPTLANDIA_DATABASE_URL ?? envCockpit.PROMPTLANDIA_DATABASE_URL ?? "";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? envCockpit.DEEPSEEK_API_KEY ?? "";
if (!DB_URL || !DEEPSEEK_KEY) {
  console.error("PROMPTLANDIA_DATABASE_URL ou DEEPSEEK_API_KEY manquant (env ou cockpit/.env)");
  process.exit(1);
}
const sql = neon(DB_URL);
const MODELE = "deepseek-chat";
const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

// --- CLI ---------------------------------------------------------------
const args = process.argv.slice(2);
const lireArg = (nom) => {
  const i = args.indexOf(nom);
  return i >= 0 ? args[i + 1] : undefined;
};
const ENRICH_ID = lireArg("--enrich");
const PATH_ARG = lireArg("--path");
// Défaut --count 1 : la QUALITÉ prime sur la quantité.
const COUNT = ENRICH_ID
  ? 1
  : Math.min(Math.max(parseInt(lireArg("--count") ?? "1", 10) || 1, 1), 10);
if (!ENRICH_ID && !PATH_ARG) {
  console.error("Usage : node index.mjs --path lp-5 [--count 1] | node index.mjs --enrich <lesson_id>");
  process.exit(1);
}

// --- LLM : JSON contraint, parse défensif, retry compacité (pattern gate,
// incident 2026-08-11 : réponse tronquée par max_tokens → JSON invalide).
// TIMEOUT DUR sur chaque appel (incident 2026-08-12 : appel suspendu sans
// timeout = run bloqué indéfiniment) : AbortSignal.timeout, l'abandon
// compte comme un échec d'essai et déclenche le retry.
const TIMEOUT_LLM_MS = 180_000;
async function appelBrut(system, user, maxTokens, temperature) {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_LLM_MS),
    headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELE,
      messages: [
        { role: "system", content: system + " Réponds en JSON COMPACT, sans commentaire hors JSON." },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return { txt: d.choices?.[0]?.message?.content ?? "{}", fini: d.choices?.[0]?.finish_reason };
}

async function ia(system, user, maxTokens = 3000, temperature = 0.6) {
  for (let essai = 1; essai <= 2; essai++) {
    try {
      // Timeout/réseau ET JSON invalide passent par le MÊME retry : un
      // seul deuxième essai, plus contraint, puis échec franc.
      const { txt, fini } = await appelBrut(
        essai === 1 ? system : system + " IMPÉRATIF : phrases COURTES, aucun texte superflu.",
        user,
        essai === 1 ? maxTokens : maxTokens + 2000,
        temperature,
      );
      let t = txt;
      const a = t.indexOf("{");
      const b = t.lastIndexOf("}");
      if (a >= 0 && b > a) t = t.slice(a, b + 1); // parse défensif (fences)
      if (fini === "length") throw new Error("tronqué");
      return JSON.parse(t);
    } catch (e) {
      if (essai === 2) {
        const nom = e && typeof e === "object" && "name" in e ? e.name : "";
        throw nom === "TimeoutError" || nom === "AbortError"
          ? new Error(`appel DeepSeek abandonné après ${TIMEOUT_LLM_MS / 1000} s (timeout dur) puis retry — API injoignable ou suspendue`)
          : e;
      }
      console.log(`  essai 1 échoué (${String(e).slice(0, 120)}) — retry…`);
      await dodo(500);
    }
  }
}

// --- Normalisation PAR CODE des étapes jeu ------------------------------
// Le modèle écrit en « format auteur » (bonne réponse EN CLAIR + leurres) ;
// le CODE mélange (Fisher-Yates) et calcule les indices — la tenue des
// index n'est JAMAIS confiée au modèle. Sortie : format joueur EXACT
// (apps/expo/utils/learning.ts parseLessonSteps).
function melanger(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mélange qui ÉVITE de révéler la solution par l'ordre d'affichage :
 *  la sous-séquence des éléments corrects ne doit pas se lire déjà dans
 *  l'ordre de la solution (et jamais de permutation identité). */
function melangerSansIndice(total, ordreSolution) {
  for (let tentative = 0; tentative < 20; tentative++) {
    const perm = melanger([...Array(total).keys()]); // position affichée -> index d'origine
    const positionDe = new Map(perm.map((orig, pos) => [orig, pos]));
    const positionsSolution = ordreSolution.map((o) => positionDe.get(o));
    const dejaTriee = positionsSolution.every((p, i) => i === 0 || p > positionsSolution[i - 1]);
    if (!dejaTriee) return perm;
  }
  return null; // improbable (p < 1/2^20 pour n ≥ 3) — l'étape sera rejetée
}

function normaliserSteps(bruts) {
  if (!Array.isArray(bruts)) return { steps: null, erreurs: ["steps absent ou non-tableau"] };
  const erreurs = [];
  const steps = [];
  for (const [i, s] of bruts.entries()) {
    const ou = `étape ${i + 1}`;
    if (!s || typeof s !== "object") { erreurs.push(`${ou} : non-objet`); continue; }
    if (s.type === "build_prompt") {
      const corrects = Array.isArray(s.correct_chips) ? s.correct_chips.map(String) : [];
      const leurres = Array.isArray(s.distractor_chips) ? s.distractor_chips.map(String) : [];
      const tous = [...corrects, ...leurres];
      // perm : position affichée -> index dans `tous` ; la solution est
      // [0..corrects.length-1] dans `tous`.
      const perm = melangerSansIndice(tous.length, [...corrects.keys()]);
      if (!perm) { erreurs.push(`${ou} (build_prompt) : mélange impossible`); continue; }
      const chips = perm.map((orig) => tous[orig]);
      const positionDe = new Map(perm.map((orig, pos) => [orig, pos]));
      steps.push({
        type: "build_prompt",
        instruction: String(s.instruction ?? ""),
        chips,
        correct_indices: corrects.map((_, k) => positionDe.get(k)),
        mode: s.mode === "anyorder" ? "anyorder" : "ordered",
        explanation: String(s.explanation ?? ""),
      });
    } else if (s.type === "sort_order") {
      const ordonnes = Array.isArray(s.items_in_order) ? s.items_in_order.map(String) : [];
      const perm = melangerSansIndice(ordonnes.length, [...ordonnes.keys()]);
      if (!perm) { erreurs.push(`${ou} (sort_order) : mélange impossible`); continue; }
      const items = perm.map((orig) => ordonnes[orig]);
      const positionDe = new Map(perm.map((orig, pos) => [orig, pos]));
      steps.push({
        type: "sort_order",
        instruction: String(s.instruction ?? ""),
        items,
        correct_order: ordonnes.map((_, k) => positionDe.get(k)),
        explanation: String(s.explanation ?? ""),
      });
    } else if (s.type === "fill_blank") {
      const correct = String(s.correct ?? "");
      const leurres = Array.isArray(s.distractors) ? s.distractors.map(String) : [];
      const options = melanger([correct, ...leurres]);
      steps.push({
        type: "fill_blank",
        sentence: String(s.sentence ?? ""),
        options,
        correct_index: options.indexOf(correct),
        explanation: String(s.explanation ?? ""),
      });
    } else {
      steps.push(s); // text / quiz / tap_reveal / try_it : déjà au format final
    }
  }
  return { steps, erreurs };
}

// --- QA PAR CODE v2 : schéma, bornes, structure RICHE et vocabulaire se
// vérifient par des règles explicites — jamais laissés au modèle.
const MAX_TEXT_CHARS = 400;
// Vocabulaire interdit (catégorie Enfants) : violence, données
// personnelles, liens externes. Regex à bornes de mots (skill ≠ kill).
const VOCAB_INTERDIT = [
  ["violence", /\b(kill(s|ed|ing)?|gun(s)?|knife|knives|blood|bloody|murder|weapon(s)?|shoot(s|ing)?|stab|bomb(s)?|death|dead|die(s|d)?|dying|war|fight(s|ing)?|punch(es|ed)?|hurt(s|ing)?)\b/i],
  ["données personnelles", /\b(your (full |real |last )?name|last name|phone number|home address|your address|e-?mail address|password(s)?|share your|send (me|us) your|credit card)\b/i],
  ["lien externe", /\b(https?:\/\/|www\.|\.com\b|\.org\b|\.net\b|youtube|tiktok|instagram|facebook)\b/i],
];

// Compteur de phrases — les abréviations d'usage (Mr./Ms./Dr.…), les
// « e.g./i.e. », les points de suspension et les décimales ne terminent
// PAS une phrase (bug réel, run 2026-08-13 : « Mr. Owl, Ms. Fox, and
// Dr. Penguin » compté 3 phrases de trop → rejets à tort).
const nbPhrases = (t) =>
  String(t)
    .replace(/\b(Mr|Mrs|Ms|Dr|St|Prof|vs|etc)\./gi, "$1")
    .replace(/\b(e\.g|i\.e)\./gi, "$1")
    .replace(/\.{2,}|…/g, ".")
    .replace(/(\d)\.(\d)/g, "$1$2")
    .split(/[.!?]+/)
    .filter((p) => p.trim().length > 1).length;
const uniques = (arr) => new Set(arr.map((o) => String(o).trim().toLowerCase())).size === arr.length;

function qaRegleCode(brouillon, titresExistants) {
  const erreurs = [];
  const compte = { text: 0, quiz: 0, tap_reveal: 0, try_it: 0, build_prompt: 0, sort_order: 0, fill_blank: 0, autre: 0 };
  const titre = typeof brouillon.title === "string" ? brouillon.title.trim() : "";
  if (!titre || titre.length > 80) erreurs.push("titre vide ou > 80 caractères");
  if (titresExistants.some((t) => t.toLowerCase() === titre.toLowerCase()))
    erreurs.push(`titre redondant avec une leçon/brouillon existant : « ${titre} »`);

  const steps = Array.isArray(brouillon.steps) ? brouillon.steps : null;
  if (!steps) return { ok: false, erreurs: ["steps absent ou non-tableau"], compte };

  steps.forEach((s, i) => {
    const ou = `étape ${i + 1}`;
    if (!s || typeof s !== "object") return erreurs.push(`${ou} : non-objet`);
    if (s.type === "text") {
      compte.text++;
      if (typeof s.content !== "string" || !s.content.trim()) erreurs.push(`${ou} (text) : content manquant`);
      else {
        if (s.content.length > MAX_TEXT_CHARS) erreurs.push(`${ou} (text) : ${s.content.length} > ${MAX_TEXT_CHARS} caractères`);
        if (nbPhrases(s.content) > 3) erreurs.push(`${ou} (text) : ${nbPhrases(s.content)} phrases (attendu ≤ 3 — texte COURT)`);
      }
    } else if (s.type === "quiz") {
      compte.quiz++;
      if (typeof s.question !== "string" || !s.question.trim() || s.question.length > 300)
        erreurs.push(`${ou} (quiz) : question manquante ou > 300 caractères`);
      const opts = Array.isArray(s.options) ? s.options : [];
      if (opts.length !== 4 || !opts.every((o) => typeof o === "string" && o.trim() && o.length <= 120))
        erreurs.push(`${ou} (quiz) : il faut exactement 4 options non vides ≤ 120 caractères`);
      if (!uniques(opts)) erreurs.push(`${ou} (quiz) : options non uniques`);
      if (!Number.isInteger(s.correct_index) || s.correct_index < 0 || s.correct_index >= opts.length)
        erreurs.push(`${ou} (quiz) : correct_index hors des options`);
      if (typeof s.explanation !== "string" || !s.explanation.trim() || s.explanation.length > MAX_TEXT_CHARS)
        erreurs.push(`${ou} (quiz) : explication manquante ou > ${MAX_TEXT_CHARS} caractères`);
    } else if (s.type === "tap_reveal") {
      compte.tap_reveal++;
      if (typeof s.prompt !== "string" || !s.prompt.trim() || s.prompt.length > 200)
        erreurs.push(`${ou} (tap_reveal) : prompt manquant ou > 200 caractères`);
      if (typeof s.reveal !== "string" || !s.reveal.trim() || s.reveal.length > MAX_TEXT_CHARS)
        erreurs.push(`${ou} (tap_reveal) : reveal manquant ou > ${MAX_TEXT_CHARS} caractères`);
    } else if (s.type === "try_it") {
      compte.try_it++;
      if (typeof s.instruction !== "string" || !s.instruction.trim() || s.instruction.length > MAX_TEXT_CHARS)
        erreurs.push(`${ou} (try_it) : instruction manquante ou > ${MAX_TEXT_CHARS} caractères`);
      // v2 : exemple de bonne réponse OBLIGATOIRE (apprendre par comparaison).
      if (typeof s.example !== "string" || !s.example.trim() || s.example.length > MAX_TEXT_CHARS)
        erreurs.push(`${ou} (try_it) : example manquant ou > ${MAX_TEXT_CHARS} caractères (obligatoire en v2)`);
      if (i !== steps.length - 1) erreurs.push(`${ou} (try_it) : doit être la DERNIÈRE étape`);
    } else if (s.type === "build_prompt") {
      compte.build_prompt++;
      if (typeof s.instruction !== "string" || !s.instruction.trim() || s.instruction.length > 300)
        erreurs.push(`${ou} (build_prompt) : instruction manquante ou > 300 caractères`);
      const chips = Array.isArray(s.chips) ? s.chips : [];
      if (chips.length < 4 || chips.length > 10 || !chips.every((c) => typeof c === "string" && c.trim() && c.length <= 40))
        erreurs.push(`${ou} (build_prompt) : 4-10 chips non vides ≤ 40 caractères attendues`);
      if (!uniques(chips)) erreurs.push(`${ou} (build_prompt) : chips non uniques`);
      const ci = Array.isArray(s.correct_indices) ? s.correct_indices : [];
      if (ci.length < 3 || ci.length > chips.length || new Set(ci).size !== ci.length ||
          !ci.every((x) => Number.isInteger(x) && x >= 0 && x < chips.length))
        erreurs.push(`${ou} (build_prompt) : correct_indices invalide (≥ 3 indices uniques dans les chips)`);
      if (s.mode !== "ordered" && s.mode !== "anyorder") erreurs.push(`${ou} (build_prompt) : mode invalide`);
      if (s.mode === "anyorder" && ci.length >= chips.length)
        erreurs.push(`${ou} (build_prompt anyorder) : il faut au moins 1 chip leurre`);
      if (typeof s.explanation !== "string" || !s.explanation.trim() || s.explanation.length > MAX_TEXT_CHARS)
        erreurs.push(`${ou} (build_prompt) : explication manquante ou > ${MAX_TEXT_CHARS} caractères`);
    } else if (s.type === "sort_order") {
      compte.sort_order++;
      if (typeof s.instruction !== "string" || !s.instruction.trim() || s.instruction.length > 300)
        erreurs.push(`${ou} (sort_order) : instruction manquante ou > 300 caractères`);
      const items = Array.isArray(s.items) ? s.items : [];
      if (items.length < 3 || items.length > 5 || !items.every((o) => typeof o === "string" && o.trim() && o.length <= 120))
        erreurs.push(`${ou} (sort_order) : 3-5 items non vides ≤ 120 caractères attendus`);
      if (!uniques(items)) erreurs.push(`${ou} (sort_order) : items non uniques`);
      const co = Array.isArray(s.correct_order) ? s.correct_order : [];
      if (co.length !== items.length || new Set(co).size !== co.length ||
          !co.every((x) => Number.isInteger(x) && x >= 0 && x < items.length))
        erreurs.push(`${ou} (sort_order) : correct_order n'est pas une permutation des items`);
      if (co.every((x, k) => x === k)) erreurs.push(`${ou} (sort_order) : items déjà dans l'ordre (jeu trivial)`);
    } else if (s.type === "fill_blank") {
      compte.fill_blank++;
      if (typeof s.sentence !== "string" || !s.sentence.trim() || s.sentence.length > 300)
        erreurs.push(`${ou} (fill_blank) : sentence manquante ou > 300 caractères`);
      else if ((s.sentence.match(/___/g) ?? []).length !== 1)
        erreurs.push(`${ou} (fill_blank) : la phrase doit contenir EXACTEMENT un trou « ___ »`);
      const opts = Array.isArray(s.options) ? s.options : [];
      if (opts.length < 3 || opts.length > 4 || !opts.every((o) => typeof o === "string" && o.trim() && o.length <= 40))
        erreurs.push(`${ou} (fill_blank) : 3-4 options non vides ≤ 40 caractères attendues`);
      if (!uniques(opts)) erreurs.push(`${ou} (fill_blank) : options non uniques`);
      if (!Number.isInteger(s.correct_index) || s.correct_index < 0 || s.correct_index >= opts.length)
        erreurs.push(`${ou} (fill_blank) : correct_index hors des options`);
      if (typeof s.explanation !== "string" || !s.explanation.trim() || s.explanation.length > MAX_TEXT_CHARS)
        erreurs.push(`${ou} (fill_blank) : explication manquante ou > ${MAX_TEXT_CHARS} caractères`);
    } else {
      compte.autre++;
      erreurs.push(`${ou} : type inconnu « ${s.type} »`);
    }
  });

  // Structure RICHE imposée (v2, qualité d'abord) : 8-12 étapes mêlant
  // 2-5 text courts, 2-3 quiz, EXACTEMENT 1 build_prompt (jeu signature),
  // EXACTEMENT 1 fill_blank OU sort_order, 1 tap_reveal, 1 try_it final.
  const total = steps.length;
  if (total < 8 || total > 12) erreurs.push(`${total} étapes (attendu 8-12)`);
  if (compte.text < 2 || compte.text > 5) erreurs.push(`${compte.text} étapes text (attendu 2-5)`);
  if (compte.quiz < 2 || compte.quiz > 3) erreurs.push(`${compte.quiz} quiz (attendu 2-3)`);
  if (compte.build_prompt !== 1) erreurs.push(`${compte.build_prompt} build_prompt (attendu 1 — le jeu signature)`);
  if (compte.sort_order + compte.fill_blank !== 1)
    erreurs.push(`${compte.sort_order} sort_order + ${compte.fill_blank} fill_blank (attendu EXACTEMENT 1 des deux)`);
  if (compte.tap_reveal !== 1) erreurs.push(`${compte.tap_reveal} tap_reveal (attendu 1)`);
  if (compte.try_it !== 1) erreurs.push(`${compte.try_it} try_it (attendu 1)`);

  // Vocabulaire interdit — sur TOUT le texte du brouillon.
  const texte = JSON.stringify(brouillon);
  for (const [categorie, re] of VOCAB_INTERDIT) {
    const m = texte.match(re);
    if (m) erreurs.push(`vocabulaire interdit (${categorie}) : « ${m[0]} »`);
  }

  return { ok: erreurs.length === 0, erreurs, compte };
}

// --- Verdict PAR CODE (seuils explicites, RELEVÉS à 80 en v2) : les
// scores IA n'emportent la décision qu'à travers ces seuils, jamais par
// un « avis » libre. Une leçon sous le seuil est REJETÉE, pas rabotée.
const SEUIL_SCORE_IA = 80;
function verdictQa(regles, qaIa) {
  const scores = {
    adapte_6_12: Number(qaIa.adapte_6_12_0_100) || 0,
    factuel: Number(qaIa.factuel_0_100) || 0,
    ton_positif: Number(qaIa.ton_positif_0_100) || 0,
    anglais: Number(qaIa.anglais_0_100) || 0,
    interessant: Number(qaIa.interessant_0_100) || 0,
    narration: Number(qaIa.narration_0_100) || 0,
    jeux: Number(qaIa.jeux_0_100) || 0,
  };
  const scoreMin = Math.min(...Object.values(scores));
  const ok = regles.ok && scoreMin >= SEUIL_SCORE_IA;
  return {
    status: ok ? "qa_ok" : "qa_rejected",
    scores,
    score_min: scoreMin,
    methode: `verdict PAR CODE : qa_ok si 0 erreur de règle ET chaque score IA ≥ ${SEUIL_SCORE_IA} (v2 qualité d'abord)`,
  };
}

// --- Consignes de génération v2 -----------------------------------------
// Format AUTEUR pour les jeux : la bonne réponse s'écrit EN CLAIR, le
// code mélange et indexe. Le modèle ne manipule JAMAIS d'indices.
const FORMAT_STEPS = `FORMAT DES ÉTAPES (JSON) :
- {"type":"text","content":str} : ≤ 3 phrases COURTES (≤ 400 caractères), qui font AVANCER l'histoire ;
- {"type":"quiz","question":str,"options":[4 str UNIQUES],"correct_index":int,"explanation":str} : la bonne réponse est options[correct_index], explication encourageante ;
- {"type":"tap_reveal","prompt":str,"reveal":str} : un fun fact surprenant et VRAI (prompt court type "💡 Did you know?") ;
- {"type":"build_prompt","instruction":str,"correct_chips":[3-6 mots/groupes DANS L'ORDRE de la solution],"distractor_chips":[1-3 leurres plausibles],"mode":"ordered"|"anyorder","explanation":str} : LE jeu signature — l'enfant assemble un vrai prompt avec des blocs de mots ("ordered" = l'ordre compte, "anyorder" = seul le choix des blocs compte) ; le prompt assemblé doit être une VRAIE phrase de prompt utile ;
- {"type":"sort_order","instruction":str,"items_in_order":[3-5 étapes DANS LE BON ORDRE],"explanation":str} : remettre dans l'ordre (le code mélangera) ;
- {"type":"fill_blank","sentence":str contenant EXACTEMENT un trou "___","correct":str,"distractors":[2-3 mots faux plausibles],"explanation":str} : phrase à trou ;
- {"type":"try_it","instruction":str,"example":str} : mini-défi créatif à faire SANS écran ou dans l'app, jamais de site externe ; "example" = UN exemple concret de bonne réponse (montré à l'enfant APRÈS son essai, pour apprendre par comparaison).`;

const STRUCTURE = `STRUCTURE OBLIGATOIRE (8 à 12 étapes, la variété fait le rythme) :
- 2 à 5 "text" COURTS qui racontent (jamais deux longs blocs de suite) ;
- 2 à 3 "quiz" répartis dans la leçon (pas tous à la fin) ;
- EXACTEMENT 1 "build_prompt" (le moment star de la leçon) ;
- EXACTEMENT 1 "fill_blank" OU 1 "sort_order" (choisis le plus pertinent) ;
- EXACTEMENT 1 "tap_reveal" ;
- EXACTEMENT 1 "try_it" (avec "example"), en DERNIÈRE étape.`;

const EXIGENCES = `EXIGENCES QUALITÉ (la qualité prime sur la quantité) :
- NARRATION CONTINUE : un fil conducteur (un personnage, une mission, un scénario rigolo) traverse TOUTE la leçon — chaque étape reprend le fil, les jeux sont des moments DE l'histoire, pas des exercices posés à côté ;
- humour léger, ton complice, JAMAIS de liste sèche ni de paragraphe encyclopédique ;
- vocabulaire simple (6-12 ans), emojis bienvenus, phrases courtes ;
- chaque quiz/jeu teste ce que l'histoire vient d'apprendre — jamais une question hors sujet.
INTERDIT : violence, armes, mort, explosions (même pour rire) ; demander/mentionner des données personnelles — ne demande JAMAIS son prénom à l'enfant, n'écris JAMAIS "your name" ; liens, URLs, marques de réseaux sociaux. Tout doit être factuel — n'invente ni statistique précise ni date douteuse.`;

// Contrat contrôlé PAR PROGRAMME : toute violation = rejet automatique.
// (Leçon des runs 2026-08-13 : sans ce bloc, le modèle écrit des blocs
// de 4-6 phrases et la révision ajoute fill_blank ET sort_order.)
const CONTRAT = `CONTRAT NON NÉGOCIABLE (vérifié par un PROGRAMME — toute violation rejette la leçon entière) :
- chaque étape "text" : MAXIMUM 3 phrases. Si tu as plus à dire, DÉCOUPE en deux étapes "text" ;
- "fill_blank" : la phrase contient EXACTEMENT un "___" (trois underscores, une seule fois) ;
- JAMAIS "fill_blank" ET "sort_order" dans la même leçon : UN SEUL des deux ;
- "try_it" est TOUJOURS la dernière étape et a TOUJOURS un "example".
CHECKLIST AVANT DE RÉPONDRE (fais-la vraiment) : 1) compte tes étapes → entre 8 et 12 ; 2) compte les phrases de CHAQUE "text" → max 3 ; 3) un seul jeu fill_blank OU sort_order ; 4) le "___" apparaît une seule fois dans la phrase du fill_blank ; 5) aucun "your name", aucune donnée personnelle.`;

const systemeRedaction = `Tu es un auteur JEUNESSE talentueux qui écrit des leçons-jeux EN ANGLAIS pour PromptLandia (app 6-12 ans : apprendre à parler aux IA, coding/STEM ludique). Ta leçon doit être un PETIT JEU D'AVENTURE captivant, pas un cours.
${FORMAT_STEPS}
${STRUCTURE}
${EXIGENCES}
${CONTRAT}
JSON: {"title":str,"steps":[...]}`;

// --- Boucle qualité ADVERSARIALE (pattern gate) --------------------------
// 1 rédaction → 2 critique IA exigeante → 3 RÉVISION → 4 QA final
// (règles code + contre-lecture IA, seuils 80). Le CODE tranche à chaque
// étage ; la critique n'est qu'un levier d'amélioration, jamais un verdict.
async function genererLeconRiche(contexte, etiquette) {
  // 1 · Rédaction.
  console.log(`  [1/4] rédaction…`);
  const v1 = await ia(systemeRedaction, contexte, 6000, 0.8);

  // 2 · Critique adversariale : un relecteur IMPITOYABLE cherche ce qui
  // ennuierait un enfant de 8 ans. Scores + reproches CONCRETS.
  console.log(`  [2/4] critique adversariale…`);
  const critique = await ia(
    `Tu es directeur pédagogique IMPITOYABLE d'un studio de jeux éducatifs. Un enfant de 8 ans va jouer cette leçon : sois dur, cherche l'ENNUI. Note de 0 à 100 :
- interessant_0_100 : un enfant de 8 ans VEUT-il continuer ? (une info plate = mauvais score)
- jeux_0_100 : les étapes jeu sont-elles de VRAIS jeux intégrés à l'histoire (build_prompt assemble-t-il un prompt utile et naturel ?) ou des exercices déguisés ?
- narration_0_100 : le fil conducteur tient-il de la première à la dernière étape, ou se perd-il ?
Liste des reproches CONCRETS (étape par étape) et des suggestions ACTIONNABLES. JSON: {"interessant_0_100":int,"jeux_0_100":int,"narration_0_100":int,"reproches":[str],"suggestions":[str]}`,
    `LEÇON À DÉMOLIR (constructivement) : ${JSON.stringify(v1)}`,
    2500,
    0.4,
  );
  const scoresCritique = [
    Number(critique.interessant_0_100) || 0,
    Number(critique.jeux_0_100) || 0,
    Number(critique.narration_0_100) || 0,
  ];
  console.log(`      critique : intéressant ${scoresCritique[0]}, jeux ${scoresCritique[1]}, narration ${scoresCritique[2]} — ${(critique.reproches ?? []).length} reproche(s)`);

  // 3 · Révision : le rédacteur refond la leçon AVEC la critique.
  // (Économie d'appel seulement si la critique est déjà excellente.)
  let brouillon = v1;
  let revise = false;
  if (Math.min(...scoresCritique) < 90) {
    console.log(`  [3/4] révision…`);
    brouillon = await ia(
      systemeRedaction + `\nIMPORTANT : tu RÉVISES ta leçon à partir d'une critique — corrige CHAQUE reproche sans casser ce qui marche. Garde le même sujet et le même titre.`,
      `${contexte}
TA PREMIÈRE VERSION : ${JSON.stringify(v1)}
CRITIQUE DU DIRECTEUR PÉDAGOGIQUE (à corriger point par point) :
reproches : ${JSON.stringify(critique.reproches ?? [])}
suggestions : ${JSON.stringify(critique.suggestions ?? [])}
RAPPEL : la structure obligatoire et le CONTRAT s'appliquent AUSSI à la révision (≤ 3 phrases par text, un seul jeu fill_blank OU sort_order, try_it final avec example).`,
      6000,
      0.7,
    );
    revise = true;
  } else {
    console.log(`  [3/4] critique excellente (min ≥ 90) — pas de révision nécessaire`);
  }

  return { brouillon, critique: { ...critique, revise }, etiquette };
}

async function qaFinal(brouillon, titresExclus) {
  // Normalisation PAR CODE (mélange + indices) AVANT le QA : les règles
  // valident le format JOUEUR final, celui qui part réellement en base.
  console.log(`  [4/4] QA final (normalisation code + règles + contre-lecture IA)…`);
  const { steps, erreurs: erreursNorm } = normaliserSteps(brouillon.steps);
  const normalise = { title: brouillon.title, steps: steps ?? [] };
  const regles = qaRegleCode(normalise, titresExclus);
  regles.erreurs.unshift(...erreursNorm);
  if (erreursNorm.length) regles.ok = false;

  // Contre-lecture IA INDÉPENDANTE (anti-invention, âge, ton, langue,
  // intérêt, narration, jeux). L'IA note, le CODE tranche (seuil 80).
  const qaIa = await ia(
    `Tu es relecteur QA INDÉPENDANT et exigeant pour du contenu enfant (6-12 ans). Contre-lis cette leçon-jeu en anglais et NOTE de 0 à 100 chaque dimension. Cherche activement : affirmations inventées ou douteuses (dates, chiffres, "facts" invérifiables), vocabulaire trop difficile, ton négatif/anxiogène, fautes d'anglais, quiz dont l'explication contredit la bonne réponse, jeux incohérents (chips qui ne forment pas une vraie phrase, ordre discutable, trou ambigu — plusieurs options défendables), fil narratif qui se perd, passages ENNUYEUX pour un enfant de 8 ans. En cas de doute sérieux, note BAS et cite le passage. JSON: {"adapte_6_12_0_100":int,"factuel_0_100":int,"ton_positif_0_100":int,"anglais_0_100":int,"interessant_0_100":int,"narration_0_100":int,"jeux_0_100":int,"problemes":[str]}`,
    `LEÇON À CONTRE-LIRE (format final joueur — pour build_prompt, la solution est chips[correct_indices] dans l'ordre ; pour sort_order, items[correct_order]) : ${JSON.stringify(normalise)}`,
    2500,
    0.3,
  );

  const verdict = verdictQa(regles, qaIa);
  return { normalise, regles, qaIa, verdict };
}

// --- main ---------------------------------------------------------------
// Contexte : mode normal (--path) ou ENRICHISSEMENT (--enrich <lesson_id>).
let PATH_ID = PATH_ARG;
let leconOrigine = null;
if (ENRICH_ID) {
  const [l] = await sql`select * from lessons where id = ${ENRICH_ID}`;
  if (!l) {
    console.error(`Leçon « ${ENRICH_ID} » introuvable — --enrich exige l'id d'une leçon PUBLIÉE`);
    process.exit(1);
  }
  leconOrigine = l;
  PATH_ID = l.path_id;
}

const parcours = (await sql`select * from learning_paths where id = ${PATH_ID}`)[0];
if (!parcours) {
  console.error(`Parcours « ${PATH_ID} » introuvable`);
  process.exit(1);
}
const lecons = await sql`
  select id, title, order_index, left(content, 300) as resume
  from lessons where path_id = ${PATH_ID} order by order_index`;
const brouillonsExistants = await sql`
  select title, status, enriches_lesson_id from lesson_drafts where path_id = ${PATH_ID}`;
// En mode enrich, le titre d'origine est LÉGITIMEMENT repris (la leçon
// est remplacée) — il sort de la liste d'exclusion.
const titresExistants = [
  ...lecons.filter((l) => !leconOrigine || l.id !== leconOrigine.id).map((l) => l.title),
  ...brouillonsExistants
    .filter((d) => !leconOrigine || d.enriches_lesson_id !== leconOrigine.id)
    .map((d) => d.title),
];
const ordreMax = lecons.reduce((m, l) => Math.max(m, l.order_index), 0);
const enAttente = brouillonsExistants.filter((d) => d.status !== "published").length;

console.log(
  leconOrigine
    ? `ENRICHISSEMENT de « ${leconOrigine.title} » (${leconOrigine.id}, parcours ${PATH_ID}) — brouillon v2 riche, publication = REMPLACEMENT des steps.`
    : `Parcours ${PATH_ID} « ${parcours.title} » — ${lecons.length} leçons publiées, ${brouillonsExistants.length} brouillons existants.`,
);
console.log(`Génération de ${COUNT} brouillon(s) v2 (qualité d'abord)…`);

const contexteParcours = `PARCOURS: ${parcours.title} (catégorie ${parcours.category}, niveau ${parcours.difficulty})
DESCRIPTION: ${parcours.description}
LEÇONS DÉJÀ PUBLIÉES (ne PAS répéter leur contenu):
${lecons.map((l) => `${l.order_index}. ${l.title} — ${String(l.resume).replace(/\s+/g, " ").slice(0, 200)}`).join("\n")}`;

let generes = 0;
let okCount = 0;
let rejCount = 0;
const titresDuRun = [];

for (let i = 1; i <= COUNT; i++) {
  const dejaPris = [...titresExistants, ...titresDuRun];
  console.log(`\n— Brouillon ${i}/${COUNT} —`);

  const contexte = leconOrigine
    ? `${contexteParcours}
MISSION : réécris ENTIÈREMENT la leçon ci-dessous en version RICHE v2 (même sujet, même niveau, mais narration + mini-jeux). Elle remplacera l'originale — couvre au moins les mêmes notions, en mieux.
TITRE (à GARDER tel quel) : ${leconOrigine.title}
LEÇON D'ORIGINE (plate, à transcender) : ${JSON.stringify(leconOrigine.steps ?? leconOrigine.content).slice(0, 4000)}`
    : `${contexteParcours}
TITRES DÉJÀ PRIS (ta leçon doit être DIFFÉRENTE et NON REDONDANTE): ${JSON.stringify(dejaPris)}
Écris la leçon n°${ordreMax + enAttente + i} du parcours : elle approfondit le sujet d'un angle NOUVEAU.`;

  // 1-3 · Rédaction → critique adversariale → révision.
  let { brouillon, critique } = await genererLeconRiche(contexte, `brouillon ${i}`);

  // En mode enrich, le titre d'origine est imposé PAR CODE (la leçon est
  // remplacée à la publication — le titre ne bouge pas).
  if (leconOrigine) brouillon = { ...brouillon, title: leconOrigine.title };

  // 1bis · Titre redondant (incident réel, run lp-5 2026-08-12) : UNE
  // re-génération complète plus contrainte AVANT le QA — la règle code
  // reste le filet final si la seconde tentative récidive.
  const estRedondant = (b) =>
    dejaPris.some((t) => t.toLowerCase() === String(b?.title ?? "").trim().toLowerCase());
  if (!leconOrigine && estRedondant(brouillon)) {
    console.log(`  titre redondant (« ${brouillon.title} ») — re-génération plus contrainte…`);
    ({ brouillon, critique } = await genererLeconRiche(
      contexte + `\nATTENTION : le titre « ${brouillon.title} » est REFUSÉ (déjà pris). Choisis un angle totalement différent.`,
      `brouillon ${i} (2e essai)`,
    ));
  }

  // 4 · QA final : normalisation code, règles v2, contre-lecture IA,
  // verdict PAR CODE (seuil 80). Rejeté = rejeté, jamais raboté — mais
  // le pipeline a droit à UNE re-génération COMPLÈTE nourrie du rapport
  // d'échec (même pattern que le titre redondant) : c'est une nouvelle
  // rédaction qui repasse toute la boucle, pas un rafistolage.
  let { normalise, regles, qaIa, verdict } = await qaFinal(brouillon, dejaPris);
  if (verdict.status === "qa_rejected") {
    console.log(`  QA rejeté (${regles.erreurs.length} erreur(s) code, score min ${verdict.score_min}) — UNE re-génération nourrie du rapport…`);
    const retour = `TENTATIVE PRÉCÉDENTE REJETÉE PAR LE QA — corrige TOUT :
erreurs de format (contrôlées par programme) : ${JSON.stringify(regles.erreurs)}
problèmes relevés par la contre-lecture : ${JSON.stringify(qaIa.problemes ?? [])}
scores trop bas (< ${SEUIL_SCORE_IA}) : ${JSON.stringify(Object.fromEntries(Object.entries(verdict.scores).filter(([, v]) => v < SEUIL_SCORE_IA)))}`;
    const seconde = await genererLeconRiche(`${contexte}\n${retour}`, `brouillon ${i} (re-génération)`);
    let brouillon2 = seconde.brouillon;
    if (leconOrigine) brouillon2 = { ...brouillon2, title: leconOrigine.title };
    const bilan2 = await qaFinal(brouillon2, dejaPris);
    // On garde la MEILLEURE des deux (une re-génération ne doit jamais
    // faire régresser) : qa_ok gagne, sinon moins d'erreurs code.
    const mieux =
      bilan2.verdict.status === "qa_ok" ||
      (verdict.status !== "qa_ok" && bilan2.regles.erreurs.length <= regles.erreurs.length);
    if (mieux) {
      ({ normalise, regles, qaIa, verdict } = bilan2);
      critique = { ...seconde.critique, revise: true };
    }
  }
  const qaReport = {
    version: 2,
    regles_code: regles,
    critique_adversariale: {
      interessant: Number(critique.interessant_0_100) || 0,
      jeux: Number(critique.jeux_0_100) || 0,
      narration: Number(critique.narration_0_100) || 0,
      reproches: critique.reproches ?? [],
      revise: Boolean(critique.revise),
    },
    qa_ia: { ...verdict.scores, problemes: qaIa.problemes ?? [] },
    verdict: verdict.status,
    seuils: verdict.methode,
    modele: MODELE,
    genere_le: new Date().toISOString(),
  };

  // 5 · Staging UNIQUEMENT (lesson_drafts) — jamais lessons ici.
  // order_index : celui de la leçon d'origine en mode enrich, sinon
  // provisoire (recalculé à la publication cockpit).
  const ordre = leconOrigine ? leconOrigine.order_index : ordreMax + enAttente + i;
  const inserted = await sql`
    insert into lesson_drafts (path_id, title, order_index, steps, status, qa_report, source, enriches_lesson_id)
    values (${PATH_ID}, ${String(normalise.title ?? "(sans titre)").slice(0, 200)}, ${ordre},
            ${JSON.stringify(normalise.steps ?? [])}, ${verdict.status},
            ${JSON.stringify(qaReport)}, ${leconOrigine ? "ia_enrich" : "ia"},
            ${leconOrigine ? leconOrigine.id : null})
    returning id`;

  titresDuRun.push(String(normalise.title ?? ""));
  generes++;
  if (verdict.status === "qa_ok") okCount++;
  else rejCount++;
  console.log(`« ${normalise.title} » → ${verdict.status} (scores IA: ${JSON.stringify(verdict.scores)}, erreurs code: ${regles.erreurs.length})`);
  if (regles.erreurs.length) console.log("  erreurs:", regles.erreurs.join(" ; "));
  console.log(`  draft ${inserted[0].id}${leconOrigine ? ` (ENRICHIT ${leconOrigine.id})` : ` (order_index provisoire ${ordre})`}`);
  await dodo(300);
}

console.log(`\nOK — ${generes} brouillon(s) : ${okCount} qa_ok, ${rejCount} qa_rejected. Validation humaine : cockpit /contenu.`);
