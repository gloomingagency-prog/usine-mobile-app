// Règles QA par CODE — module partagé (générateur + re-QA).
// Extrait de index.mjs le 2026-08-14 pour import sans exécuter le CLI.

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


export const SEUIL_SCORE_IA = 80;

// --- Réparation déterministe AVANT QA -----------------------------------
// Constat (runs lp-5 des 2026-08-13/14) : DeepSeek viole systématiquement
// deux contraintes pourtant explicites du prompt — textes > 3 phrases et
// sort_order + fill_blank ensemble. Plutôt que re-payer des générations,
// le CODE répare ce qui est mécanique ; ce qui touche au fond (quiz
// manquant, vocabulaire, scores IA) reste un rejet.

// Découpe un texte en phrases SANS altérer le contenu : on masque les
// points non terminaux (abréviations, e.g., décimales) par un caractère
// de même longueur, on repère les frontières sur la version masquée et
// on découpe l'original aux mêmes positions.
function decouperEnPhrases(texte) {
  const masque = String(texte)
    .replace(/\b(Mr|Mrs|Ms|Dr|St|Prof|vs|etc)\./gi, (m) => m.slice(0, -1) + "•")
    .replace(/\b(e\.g|i\.e)\./gi, (m) => m.replace(/\./g, "•"))
    .replace(/(\d)\.(\d)/g, "$1•$2");
  const phrases = [];
  let debut = 0;
  const re = /[.!?…]+(?=\s|$)/g;
  let m;
  while ((m = re.exec(masque))) {
    const fin = m.index + m[0].length;
    const p = String(texte).slice(debut, fin).trim();
    if (p) phrases.push(p);
    debut = fin;
  }
  const reste = String(texte).slice(debut).trim();
  if (reste) phrases.push(reste);
  return phrases;
}

/**
 * Répare les violations MÉCANIQUES de structure ; retourne
 * { steps, reparations } — `reparations` liste ce qui a été fait (à
 * consigner dans le rapport QA). Jamais de réparation qui créerait une
 * autre violation : dans le doute, on laisse et le QA tranche.
 */
export function reparerStructure(steps) {
  if (!Array.isArray(steps)) return { steps, reparations: [] };
  const reparations = [];
  const resultat = [...steps];
  const estSecondaire = (s) => s?.type === "sort_order" || s?.type === "fill_blank";
  const estJouable = (s) => ["quiz", "build_prompt", "sort_order", "fill_blank"].includes(s?.type);

  // 1 · EXACTEMENT 1 jeu secondaire (sort_order OU fill_blank) : on retire
  // les excédents en partant de la FIN (le premier s'insère généralement
  // mieux dans la narration), sans faire tomber les jouables sous 4.
  let nbSecondaires = resultat.filter(estSecondaire).length;
  let jouables = resultat.filter(estJouable).length;
  while (nbSecondaires > 1 && jouables > 4) {
    const idx = resultat.findLastIndex(estSecondaire);
    reparations.push(`étape ${idx + 1} (${resultat[idx].type}) retirée — un seul jeu secondaire autorisé`);
    resultat.splice(idx, 1);
    nbSecondaires--;
    jouables--;
  }

  // 2 · text > 3 phrases : découpe équilibrée en étapes consécutives,
  // dans les plafonds globaux (12 étapes, 6 text).
  for (let i = 0; i < resultat.length; i++) {
    const s = resultat[i];
    if (s?.type !== "text" || typeof s.content !== "string") continue;
    const phrases = decouperEnPhrases(s.content);
    if (nbPhrases(s.content) <= 3 || phrases.length < 2) continue;
    const nbMorceaux = Math.ceil(phrases.length / 3);
    const totalApres = resultat.length + nbMorceaux - 1;
    const textApres = resultat.filter((x) => x?.type === "text").length + nbMorceaux - 1;
    if (totalApres > 12 || textApres > 6) continue; // plus de place — rejet honnête
    const morceaux = [];
    const base = Math.floor(phrases.length / nbMorceaux);
    const extra = phrases.length % nbMorceaux;
    let pos = 0;
    for (let k = 0; k < nbMorceaux; k++) {
      const taille = base + (k < extra ? 1 : 0);
      morceaux.push(phrases.slice(pos, pos + taille).join(" "));
      pos += taille;
    }
    if (morceaux.some((mo) => nbPhrases(mo) > 3 || mo.length > MAX_TEXT_CHARS)) continue;
    reparations.push(`étape ${i + 1} (text) : ${phrases.length} phrases découpées en ${nbMorceaux} étapes`);
    resultat.splice(i, 1, ...morceaux.map((content) => ({ ...s, content })));
    i += nbMorceaux - 1;
  }

  return { steps: resultat, reparations };
}

export function qaRegleCode(brouillon, titresExistants) {
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
  // 2-6 text courts (et ≥ 4 étapes jouables), 2-3 quiz, EXACTEMENT 1 build_prompt (jeu signature),
  // EXACTEMENT 1 fill_blank OU sort_order, 1 tap_reveal, 1 try_it final.
  const total = steps.length;
  if (total < 8 || total > 12) erreurs.push(`${total} étapes (attendu 8-12)`);
  // Arbitrage 2026-08-14 : le RATIO prime sur le compte absolu — 6 text
  // acceptés si la leçon reste majoritairement jouable (≥ 4 étapes
  // interactives). Le meilleur candidat réel (scores IA tous ≥ 80)
  // échouait uniquement sur l'ancien plafond de 5.
  const jouables = (compte.quiz ?? 0) + (compte.build_prompt ?? 0) + (compte.fill_blank ?? 0) + (compte.sort_order ?? 0);
  if (compte.text < 2 || compte.text > 6) erreurs.push(`${compte.text} étapes text (attendu 2-6)`);
  if (jouables < 4) erreurs.push(`${jouables} étapes jouables (attendu ≥ 4)`);
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
