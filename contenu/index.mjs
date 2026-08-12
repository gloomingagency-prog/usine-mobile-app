// Pipeline contenu v1 — génération de brouillons de leçons pour les apps
// du portfolio (PromptLandia). L'IA RÉDIGE EN AMONT, un QA automatique
// (règles PAR CODE + contre-lecture IA) trie, l'HUMAIN valide dans le
// cockpit (/contenu), la publication insère dans `lessons`. AUCUN contenu
// non validé n'atteint l'enfant : ce script n'écrit QUE dans
// `lesson_drafts` (base Neon PROMPTLANDIA), jamais dans `lessons`.
//
// Usage : node index.mjs --path lp-5 --count 2
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
const PATH_ID = lireArg("--path");
const COUNT = Math.min(Math.max(parseInt(lireArg("--count") ?? "1", 10) || 1, 1), 10);
if (!PATH_ID) {
  console.error("Usage : node index.mjs --path lp-5 --count 2");
  process.exit(1);
}

// --- LLM : JSON contraint, parse défensif, retry compacité (pattern gate,
// incident 2026-08-11 : réponse tronquée par max_tokens → JSON invalide).
// TIMEOUT DUR sur chaque appel (incident 2026-08-12 : appel suspendu sans
// timeout = run bloqué indéfiniment) : AbortSignal.timeout, l'abandon
// compte comme un échec d'essai et déclenche le retry.
const TIMEOUT_LLM_MS = 120_000;
async function appelBrut(system, user, maxTokens) {
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
      temperature: 0.6,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return { txt: d.choices?.[0]?.message?.content ?? "{}", fini: d.choices?.[0]?.finish_reason };
}

async function ia(system, user, maxTokens = 3000) {
  for (let essai = 1; essai <= 2; essai++) {
    try {
      // Timeout/réseau ET JSON invalide passent par le MÊME retry : un
      // seul deuxième essai, plus contraint, puis échec franc.
      const { txt, fini } = await appelBrut(
        essai === 1 ? system : system + " IMPÉRATIF : phrases COURTES, aucun texte superflu.",
        user,
        essai === 1 ? maxTokens : maxTokens + 1500,
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

// --- QA PAR CODE : le schéma, les bornes et le vocabulaire se vérifient
// par des règles explicites — jamais laissés à l'appréciation du modèle.
const MAX_TEXT_CHARS = 400;
// Vocabulaire interdit (catégorie Enfants) : violence, données
// personnelles, liens externes. Regex à bornes de mots (skill ≠ kill).
const VOCAB_INTERDIT = [
  ["violence", /\b(kill(s|ed|ing)?|gun(s)?|knife|knives|blood|bloody|murder|weapon(s)?|shoot(s|ing)?|stab|bomb(s)?|death|dead|die(s|d)?|dying|war|fight(s|ing)?|punch(es|ed)?|hurt(s|ing)?)\b/i],
  ["données personnelles", /\b(your (full |real |last )?name|last name|phone number|home address|your address|e-?mail address|password(s)?|share your|send (me|us) your|credit card)\b/i],
  ["lien externe", /\b(https?:\/\/|www\.|\.com\b|\.org\b|\.net\b|youtube|tiktok|instagram|facebook)\b/i],
];

function qaRegleCode(brouillon, titresExistants) {
  const erreurs = [];
  const compte = { text: 0, quiz: 0, tap_reveal: 0, try_it: 0, autre: 0 };
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
      else if (s.content.length > MAX_TEXT_CHARS) erreurs.push(`${ou} (text) : ${s.content.length} > ${MAX_TEXT_CHARS} caractères`);
    } else if (s.type === "quiz") {
      compte.quiz++;
      if (typeof s.question !== "string" || !s.question.trim() || s.question.length > 300)
        erreurs.push(`${ou} (quiz) : question manquante ou > 300 caractères`);
      const opts = Array.isArray(s.options) ? s.options : [];
      if (opts.length !== 4 || !opts.every((o) => typeof o === "string" && o.trim() && o.length <= 120))
        erreurs.push(`${ou} (quiz) : il faut exactement 4 options non vides ≤ 120 caractères`);
      const uniques = new Set(opts.map((o) => String(o).trim().toLowerCase()));
      if (uniques.size !== opts.length) erreurs.push(`${ou} (quiz) : options non uniques`);
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
    } else {
      compte.autre++;
      erreurs.push(`${ou} : type inconnu « ${s.type} »`);
    }
  });

  // Structure imposée : 4-7 text, 1-2 quiz, 1 tap_reveal, 1 try_it.
  if (compte.text < 4 || compte.text > 7) erreurs.push(`${compte.text} étapes text (attendu 4-7)`);
  if (compte.quiz < 1 || compte.quiz > 2) erreurs.push(`${compte.quiz} quiz (attendu 1-2)`);
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

// --- Verdict PAR CODE (seuils explicites) : les scores IA n'emportent la
// décision qu'à travers ces seuils, jamais par un « avis » libre.
const SEUIL_SCORE_IA = 70;
function verdictQa(regles, qaIa) {
  const scores = {
    adapte_6_12: Number(qaIa.adapte_6_12_0_100) || 0,
    factuel: Number(qaIa.factuel_0_100) || 0,
    ton_positif: Number(qaIa.ton_positif_0_100) || 0,
    anglais: Number(qaIa.anglais_0_100) || 0,
  };
  const scoreMin = Math.min(...Object.values(scores));
  const ok = regles.ok && scoreMin >= SEUIL_SCORE_IA;
  return {
    status: ok ? "qa_ok" : "qa_rejected",
    scores,
    score_min: scoreMin,
    methode: `verdict PAR CODE : qa_ok si 0 erreur de règle ET chaque score IA ≥ ${SEUIL_SCORE_IA}`,
  };
}

// --- main ---------------------------------------------------------------
const parcours = (await sql`select * from learning_paths where id = ${PATH_ID}`)[0];
if (!parcours) {
  console.error(`Parcours « ${PATH_ID} » introuvable`);
  process.exit(1);
}
const lecons = await sql`
  select title, order_index, left(content, 300) as resume
  from lessons where path_id = ${PATH_ID} order by order_index`;
const brouillonsExistants = await sql`
  select title, status from lesson_drafts where path_id = ${PATH_ID}`;
const titresExistants = [
  ...lecons.map((l) => l.title),
  ...brouillonsExistants.map((d) => d.title),
];
const ordreMax = lecons.reduce((m, l) => Math.max(m, l.order_index), 0);
const enAttente = brouillonsExistants.filter((d) => d.status !== "published").length;

console.log(`Parcours ${PATH_ID} « ${parcours.title} » — ${lecons.length} leçons publiées, ${brouillonsExistants.length} brouillons existants.`);
console.log(`Génération de ${COUNT} brouillon(s)…`);

const contexteParcours = `PARCOURS: ${parcours.title} (catégorie ${parcours.category}, niveau ${parcours.difficulty})
DESCRIPTION: ${parcours.description}
LEÇONS DÉJÀ PUBLIÉES (ne PAS répéter leur contenu — la nouvelle leçon PROLONGE le parcours):
${lecons.map((l) => `${l.order_index}. ${l.title} — ${String(l.resume).replace(/\s+/g, " ").slice(0, 200)}`).join("\n")}`;

let generes = 0;
let okCount = 0;
let rejCount = 0;
const titresDuRun = [];

for (let i = 1; i <= COUNT; i++) {
  const dejaPris = [...titresExistants, ...titresDuRun];
  console.log(`\n— Brouillon ${i}/${COUNT} —`);

  // 1 · Rédaction (l'IA écrit, le format est imposé).
  const systemeRedaction =
    `Tu es auteur pédagogique pour enfants de 6 à 12 ans. Rédige UNE nouvelle leçon EN ANGLAIS pour l'app PromptLandia (coding/STEM/IA ludique), au format d'étapes EXACT ci-dessous. RÈGLES STRICTES :
- 4 à 7 étapes {"type":"text","content":str} : phrases courtes, ton enthousiaste et positif, ≤ 400 caractères chacune, vocabulaire simple, emojis bienvenus ;
- 1 à 2 étapes {"type":"quiz","question":str,"options":[4 strings UNIQUES],"correct_index":int,"explanation":str} : la bonne réponse est options[correct_index], explication encourageante ;
- EXACTEMENT 1 étape {"type":"tap_reveal","prompt":str,"reveal":str} : un fun fact surprenant et VRAI (prompt court type "💡 Did you know?") ;
- EXACTEMENT 1 étape {"type":"try_it","instruction":str} : un mini-défi à faire SANS écran ou dans l'app, jamais de site externe.
INTERDIT : violence, armes, mort ; demander/mentionner des données personnelles (nom complet, adresse, téléphone, email, mot de passe) ; liens, URLs, marques de réseaux sociaux. Tout doit être factuel — n'invente ni statistique précise ni date douteuse ; les faits restent généraux et vérifiables. Le quiz se place vers la fin, le try_it en dernier.
JSON: {"title":str,"steps":[...]}`;
  const utilisateurRedaction = `${contexteParcours}
TITRES DÉJÀ PRIS (ta leçon doit être DIFFÉRENTE et NON REDONDANTE): ${JSON.stringify(dejaPris)}
Écris la leçon n°${ordreMax + enAttente + i} du parcours : elle approfondit le sujet d'un angle NOUVEAU.`;
  let brouillon = await ia(systemeRedaction, utilisateurRedaction, 3200);

  // 1bis · Titre redondant (incident réel, run lp-5 2026-08-12 : le
  // modèle a repris le titre du brouillon précédent malgré la consigne) :
  // UNE re-génération plus contrainte AVANT le QA — la règle code reste
  // le filet final si la seconde tentative récidive.
  const estRedondant = (b) =>
    dejaPris.some((t) => t.toLowerCase() === String(b?.title ?? "").trim().toLowerCase());
  if (estRedondant(brouillon)) {
    console.log(`  titre redondant (« ${brouillon.title} ») — re-génération plus contrainte…`);
    brouillon = await ia(
      systemeRedaction +
        ` IMPÉRATIF : le titre et l'angle doivent être ABSOLUMENT NOUVEAUX — tout titre de la liste fournie est STRICTEMENT INTERDIT, même reformulé.`,
      utilisateurRedaction + `\nATTENTION : ta précédente proposition « ${brouillon.title} » est REFUSÉE (déjà prise). Choisis un angle totalement différent.`,
      3200,
    );
  }

  // 2 · QA règles PAR CODE.
  const regles = qaRegleCode(brouillon, dejaPris);

  // 3 · QA IA : contre-lecture indépendante (anti-invention, âge, ton,
  // langue). L'IA note, le CODE tranche.
  const qaIa = await ia(
    `Tu es relecteur QA INDÉPENDANT et exigeant pour du contenu enfant (6-12 ans). Contre-lis cette leçon en anglais et NOTE de 0 à 100 chaque dimension. Cherche activement : affirmations inventées ou douteuses (dates, chiffres, "facts" invérifiables), vocabulaire trop difficile ou inadapté à l'âge, ton négatif/anxiogène, fautes d'anglais, quiz dont l'explication contredit la bonne réponse. En cas de doute sérieux sur un fait, note factuel BAS et cite le passage. JSON: {"adapte_6_12_0_100":int,"factuel_0_100":int,"ton_positif_0_100":int,"anglais_0_100":int,"problemes":[str]}`,
    `LEÇON À CONTRE-LIRE: ${JSON.stringify(brouillon)}`,
    1500,
  );

  // 4 · Verdict PAR CODE + rapport complet.
  const verdict = verdictQa(regles, qaIa);
  const qaReport = {
    regles_code: regles,
    qa_ia: { ...verdict.scores, problemes: qaIa.problemes ?? [] },
    verdict: verdict.status,
    seuils: verdict.methode,
    modele: MODELE,
    genere_le: new Date().toISOString(),
  };

  // 5 · Staging UNIQUEMENT (lesson_drafts) — jamais lessons ici.
  // order_index provisoire : recalculé à la publication (cockpit).
  const ordre = ordreMax + enAttente + i;
  const inserted = await sql`
    insert into lesson_drafts (path_id, title, order_index, steps, status, qa_report, source)
    values (${PATH_ID}, ${String(brouillon.title ?? "(sans titre)").slice(0, 200)}, ${ordre},
            ${JSON.stringify(brouillon.steps ?? [])}, ${verdict.status},
            ${JSON.stringify(qaReport)}, 'ia')
    returning id`;

  titresDuRun.push(String(brouillon.title ?? ""));
  generes++;
  if (verdict.status === "qa_ok") okCount++;
  else rejCount++;
  console.log(`« ${brouillon.title} » → ${verdict.status} (scores IA: ${JSON.stringify(verdict.scores)}, erreurs code: ${regles.erreurs.length})`);
  if (regles.erreurs.length) console.log("  erreurs:", regles.erreurs.join(" ; "));
  console.log(`  draft ${inserted[0].id} (order_index provisoire ${ordre})`);
  await dodo(300);
}

console.log(`\nOK — ${generes} brouillon(s) : ${okCount} qa_ok, ${rejCount} qa_rejected. Validation humaine : cockpit /contenu.`);
