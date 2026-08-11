// Gate de viabilité v1 — étage 1 de l'usine. Cron horaire sur le VPS.
// Traite UNE idée `a_analyser` sans dossier par passe : enrichit les
// données (avis réels, teardown des similaires), fait argumenter l'IA
// (wedge → 3 tours adversariaux → 4 critiques indépendants), puis le
// CODE calcule probabilité et verdict go/pivot/kill. L'humain garde le
// gate final dans le cockpit. Méthode : skill product-wedge-analysis.

import { neon } from "@neondatabase/serverless";
import gplay from "google-play-scraper";

const sql = neon(process.env.DATABASE_URL ?? "");
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? "";
if (!process.env.DATABASE_URL || !DEEPSEEK_KEY) {
  console.error("DATABASE_URL ou DEEPSEEK_API_KEY manquant");
  process.exit(1);
}

const JOB = "gate-viabilite";
const CADENCE_SEC = 3600;
const MODELE = "deepseek-chat";
const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Verrou + heartbeat (même pattern que le radar) -------------------
async function poserVerrou() {
  await sql`update cron_heartbeats set status = 'error',
    note = 'verrou libéré automatiquement (running > 2× cadence = crash)', finished_at = now()
    where job = ${JOB} and status = 'running'
      and started_at < now() - make_interval(secs => ${2 * CADENCE_SEC})`;
  const rows = await sql`
    insert into cron_heartbeats (id, job, status, expected_every_sec)
    select gen_random_uuid()::text, ${JOB}, 'running', ${CADENCE_SEC}
    where not exists (select 1 from cron_heartbeats where job = ${JOB} and status = 'running')
    returning id`;
  return rows[0]?.id ?? null;
}
const fermerVerrou = (id, status, note) =>
  sql`update cron_heartbeats set status = ${status}, note = ${note}, finished_at = now() where id = ${id}`;

// --- LLM : une tâche = une sortie JSON contrainte, parsée défensivement.
// Incident réel (2026-08-11) : réponse tronquée par max_tokens → JSON
// invalide. D'où : consigne de compacité, détection finish_reason=length,
// et UNE re-tentative plus contrainte avant d'échouer.
async function appelBrut(system, user, maxTokens) {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELE,
      messages: [
        { role: "system", content: system + " Réponds en JSON COMPACT : strings courtes, jamais plus de 6 éléments par tableau." },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return { txt: d.choices?.[0]?.message?.content ?? "{}", fini: d.choices?.[0]?.finish_reason };
}

async function ia(system, user, maxTokens = 3000) {
  for (let essai = 1; essai <= 2; essai++) {
    const { txt, fini } = await appelBrut(
      essai === 1 ? system : system + " IMPÉRATIF : citations ≤ 140 caractères, 4 éléments max par tableau.",
      user,
      essai === 1 ? maxTokens : maxTokens + 1500,
    );
    let t = txt;
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) t = t.slice(a, b + 1); // parse défensif (fences)
    try {
      if (fini === "length") throw new Error("tronqué");
      return JSON.parse(t);
    } catch (e) {
      if (essai === 2) throw e;
      await dodo(500);
    }
  }
}

// --- Check sherlocking PAR CODE (liste de capacités natives OS) -------
const NATIFS = [
  ["lampe|flashlight", "Lampe torche native"],
  ["scanner|scan pdf|qr code", "Scanner de documents/QR natif (Appareil photo/Fichiers)"],
  ["minuteur|timer|chrono", "Minuteurs natifs (Horloge)"],
  ["suivi colis|package track", "Suivi de colis natif (Wallet iOS 26)"],
  ["suivi vol|flight track", "Suivi de vols natif (iOS 26 — cas Flighty)"],
  ["filtrage appel|call screen|spam call", "Filtrage d'appels natif (Call Screening)"],
  ["mot de passe|password", "Gestionnaire de mots de passe natif"],
  ["fond d'écran|wallpaper", "Fonds d'écran natifs — catégorie 4.3(b) refusée par Apple"],
  ["enregistr(ement|eur) (vocal|audio)|voice memo", "Dictaphone natif"],
  ["sommeil|sleep track", "Suivi du sommeil natif (Santé/Watch)"],
  ["podomètre|step count", "Podomètre natif (Santé/Fit)"],
  ["traduc", "Traduction native (Apple/Google Translate intégrés)"],
];
function checkSherlocking(texte) {
  const t = texte.toLowerCase();
  return NATIFS.filter(([re]) => new RegExp(re).test(t)).map(([, label]) => label);
}

// --- Business plan : l'IA choisit le MODÈLE, le CODE calcule TOUT -----
// Benchmarks encodés (sources datées dans docs/planning/ANALYSE_MARCHE.md) :
// conversion download→payant médiane 2026 : freemium ~2,1 %, paywall dur
// ~10,7 % (RevenueCat) ; commission stores 15 % (< 1 M$/an) ; coûts fixes
// ~10 $/mois/app. V1 volontairement simple : revenu d'une cohorte
// mensuelle d'installs, sans churn cumulé — étiqueté comme tel.
function calculerBusinessPlan(m) {
  const paywallDur = m.paywall === "dur";
  const conv = paywallDur
    ? { prudent: 0.04, median: 0.107, optimiste: 0.15 }
    : { prudent: 0.01, median: 0.021, optimiste: 0.04 };
  const prixMois = Math.min(Math.max(Number(m.prix_mensuel_usd) || 9.99, 0.99), 49.99);
  const COMMISSION = 0.15;
  const COUTS_FIXES = 10;
  const scenarios = [
    ["prudent", 1000],
    ["median", 5000],
    ["optimiste", 20000],
  ].map(([nom, installs]) => {
    const abonnes = Math.round(installs * conv[nom]);
    const mrrNet = Math.round(abonnes * prixMois * (1 - COMMISSION));
    return {
      scenario: nom,
      installs_mois: installs,
      conversion_pct: +(conv[nom] * 100).toFixed(1),
      abonnes_mois: abonnes,
      mrr_net_usd: mrrNet,
      profit_mois_usd: mrrNet - COUTS_FIXES,
    };
  });
  const seuil = Math.ceil(COUTS_FIXES / (conv.median * prixMois * (1 - COMMISSION)));
  const prixRef = Number(m.prix_reference_concurrents_usd) || null;
  const sousCotePct = prixRef ? Math.round((1 - prixMois / prixRef) * 100) : null;
  return {
    modele: m.modele,
    prix_reference_concurrents_usd: prixRef,
    sous_cote_pct: sousCotePct,
    paywall: paywallDur ? "dur (onboarding)" : "freemium",
    prix_mensuel_usd: prixMois,
    prix_annuel_usd: Number(m.prix_annuel_usd) || Math.round(prixMois * 12 * 0.6),
    sources_revenus: m.sources_revenus ?? [],
    justification: m.justification ?? "",
    commission_stores: "15 % (programmes small business, < 1 M$/an)",
    couts_fixes_mois_usd: COUTS_FIXES,
    scenarios,
    seuil_rentabilite_installs_mois: seuil,
    objectifs: {
      d1_pct: 30,
      d7_pct: 15,
      d30_pct: 8,
      note: "cibles rétention = top quartile (Adjust 2026) ; objectif J+90 : tenir le scénario prudent 3 mois consécutifs",
    },
    methode:
      "calculs PAR CODE — conversion par type de paywall (RevenueCat 2026 : freemium ~2,1 %, paywall dur ~10,7 % médian), commission 15 %, coûts fixes ~10 $/mois/app ; revenu de cohorte mensuelle SANS churn cumulé (v1 prudente)",
  };
}

// --- Verdict PAR CODE (seuils explicites, décote données maigres) -----
function calculerVerdict(critiques, nbAvis) {
  const scores = critiques.map((c) => Math.max(0, Math.min(100, Number(c.score) || 0)));
  const kills = critiques.filter((c) => c.kill === true);
  let probabilite = Math.round(
    (scores[0] * 1.5 + scores[1] + scores[2] + scores[3]) / 4.5, // distribution pèse 1,5×
  );
  if (nbAvis < 30) probabilite -= 10; // décote : données maigres
  probabilite = Math.max(0, Math.min(100, probabilite));
  let verdict;
  if (kills.length > 0 || probabilite < 35) verdict = "kill";
  else if (probabilite >= 55 && Math.min(...scores) >= 40) verdict = "go";
  else verdict = "pivot";
  return { probabilite, verdict, kills: kills.map((k) => k.raison) };
}

// --- Enrichissement AVANT de générer (sources pauvres → IA invente) ---
async function enrichir(idee) {
  const manuelle = !idee.app_ref;
  let plaintes = [];
  let similaires = [];
  let nbAvis = 0;
  if (!manuelle) {
    try {
      const r = await gplay.reviews({ appId: idee.app_ref, country: "us", sort: gplay.sort.NEWEST, num: 150 });
      plaintes = (r.data ?? [])
        .filter((a) => a.score <= 3 && (a.text ?? "").length > 25)
        .slice(0, 40)
        .map((a) => `${a.score}★ ${a.text.slice(0, 220)}`);
      nbAvis = plaintes.length;
    } catch { /* app régionale : le dossier le signalera */ }
    try {
      const sim = await gplay.similar({ appId: idee.app_ref, country: "us" });
      for (const s of sim.slice(0, 8)) {
        await dodo(300);
        try {
          const d = await gplay.app({ appId: s.appId, country: "us" });
          similaires.push({ titre: d.title, note: Math.round(d.score * 100) / 100, avis: d.ratings, installs: d.minInstalls });
        } catch { /* ignorer */ }
      }
    } catch { /* idem */ }
  }
  // Incident vécu (NeoMind, 2026-08-11) : app_ref invalide → 0 plainte
  // minée → les critiques ont jugé « demande latente » SANS données.
  // Une référence attachée qui ne rend rien est SUSPECTE, jamais avalée.
  let refSuspecte = false;
  if (!manuelle || idee.app_ref) {
    if (idee.app_ref && plaintes.length === 0 && similaires.length === 0) {
      refSuspecte = true;
      try {
        await gplay.app({ appId: idee.app_ref, country: "us" });
        refSuspecte = false; // l'app existe : juste pauvre en avis récents
      } catch {
        /* app_ref introuvable : refSuspecte reste true */
      }
    }
  }
  return { manuelle, plaintes, similaires, nbAvis, refSuspecte };
}

async function analyser(idee) {
  const { manuelle, plaintes, similaires, nbAvis, refSuspecte } = await enrichir(idee);
  if (refSuspecte) {
    throw new Error(
      `app_ref « ${idee.app_ref} » introuvable sur le store — corriger la référence avant d'analyser (aucun dossier produit sans données)`,
    );
  }
  const contexte = `IDÉE: ${idee.titre} (catégorie ${idee.categorie})
RÉSUMÉ: ${idee.resume}
MÉTRIQUES: ${JSON.stringify(idee.metrics).slice(0, 800)}
PLAINTES RÉELLES (avis 1-3★ récents${manuelle ? " — AUCUNE, idée manuelle" : ""}):
${plaintes.join("\n").slice(0, 6000) || "(aucune donnée)"}
CONCURRENTS SIMILAIRES: ${JSON.stringify(similaires)}`;

  // 1 · Thèmes de plaintes (l'IA CLASSE, elle n'invente pas)
  const themes = await ia(
    "Tu es analyste marché. Classe les plaintes RÉELLES fournies en 6 thèmes MAX. N'invente RIEN : chaque thème cite 2 extraits fournis, tronqués à 140 caractères. JSON: {\"themes\":[{\"theme\":str,\"frequence\":int,\"citations\":[str,str]}]}",
    contexte,
  );

  // 2 · Proposition de wedge, puis 3 tours adversariaux
  let proposition = await ia(
    "Tu es stratège produit mobile. Propose UN wedge pour battre cet incumbent faible : la douleur #1 (ancrée dans les plaintes), UNE killer feature (grosse, pas une micro-amélioration, avec critères d'acceptance testables), le canal des 100 premiers utilisateurs (PAS \"les stores\"), la cible précise. JSON: {\"douleur\":str,\"killer_feature\":str,\"acceptance\":[str],\"canal_100\":str,\"cible\":str}",
    contexte + "\nTHÈMES: " + JSON.stringify(themes),
  );
  const toursAdversariaux = [];
  for (let tour = 1; tour <= 3; tour++) {
    const critique = await ia(
      "Tu es un critique PESSIMISTE. Attaque cette proposition sans complaisance : distribution, copiabilité, sherlocking, churn, réalisme. JSON: {\"faiblesses\":[str],\"should_pivot\":bool,\"attaque_principale\":str}",
      `PROPOSITION: ${JSON.stringify(proposition)}\nCONTEXTE: ${contexte.slice(0, 3000)}`,
    );
    toursAdversariaux.push({ tour, critique });
    proposition = await ia(
      "Tu es le stratège. Révise ta proposition pour répondre à la critique — durcis, précise, ou change d'angle si l'attaque est structurelle. Même format JSON que la proposition initiale, plus {\"reponse_critique\":str}.",
      `PROPOSITION: ${JSON.stringify(proposition)}\nCRITIQUE: ${JSON.stringify(critique)}`,
    );
    await dodo(300);
  }

  // 3 · Sherlocking par code (sur titre + genre + douleur + feature)
  const sherlocking = checkSherlocking(
    `${idee.titre} ${idee.metrics?.genre ?? ""} ${proposition.douleur ?? ""} ${proposition.killer_feature ?? ""}`,
  );

  // 3bis · La PROPOSITION DE VALEUR : les features que NOUS apportons.
  // Chaque feature est ancrée dans une douleur réelle des plaintes — c'est
  // ce qui se lit côté administration et se vend derrière.
  const featuresRep = await ia(
    "Tu es product manager mobile. Liste les features DIFFÉRENCIANTES que NOTRE app apporterait face aux concurrents. Max 6, la première est la killer feature. Chaque feature DOIT répondre à une douleur présente dans les plaintes/thèmes fournis — n'invente pas de besoin. JSON: {\"features\":[{\"feature\":str,\"type\":\"killer\"|\"differenciante\"|\"support\",\"douleur\":str,\"pourquoi_absent_chez_eux\":str,\"effort\":\"S\"|\"M\"|\"L\",\"argument_vente\":str}]}",
    `PROPOSITION FINALE: ${JSON.stringify(proposition)}\nTHÈMES DE PLAINTES: ${JSON.stringify(themes).slice(0, 2500)}\nCONCURRENTS: ${JSON.stringify(similaires)}`,
  );
  const features = featuresRep.features ?? [];

  // 3ter · Archétype du pari + potentiel de percée (doctrine portefeuille :
  // l'objectif est de faire PERCER une app, pas de maximiser le MRR).
  const archetype = await ia(
    "Classe cette opportunité dans UN archétype de pari : 'compounding' (rétention/communauté, revenu moyen-long terme), 'cash' (utilitaire à conversion rapide), 'loterie' (novelty/viral à forte variance — attention au risque de review store). Estime le POTENTIEL DE PERCÉE (audience atteignable, boucle virale/communauté, profondeur de la douleur), pas la rentabilité. JSON: {\"archetype\":\"compounding\"|\"cash\"|\"loterie\",\"potentiel_percee_0_100\":int,\"raison\":str}",
    `PROPOSITION: ${JSON.stringify(proposition)}\nCATÉGORIE: ${idee.categorie}\nMÉTRIQUES: ${JSON.stringify(idee.metrics).slice(0, 500)}`,
  );

  // 3quater · Modèle de monétisation : l'IA choisit et justifie, le code
  // calcule les projections. DOCTRINE PRIX (décision utilisateur) :
  // faire MIEUX pour MOINS CHER — nos coûts ≈ 0 permettent de sous-coter.
  const bpChoix = await ia(
    "Tu es analyste business mobile. DOCTRINE : nos coûts de maintenance sont quasi nuls — propose un PRIX D'ATTAQUE ~30-50 % SOUS la référence des concurrents, TOUT en livrant plus de valeur (les features fournies). Monétisation honnête : le gratuit livre un vrai basique, le payant résout une vraie douleur, jamais de tier sans valeur. Le prix bas achète du volume et des avis (le moat des stores) ; le MIEUX reste le différenciateur, le prix n'est que l'accélérateur. JSON: {\"modele\":str,\"paywall\":\"dur\"|\"freemium\",\"prix_mensuel_usd\":number,\"prix_annuel_usd\":number,\"prix_reference_concurrents_usd\":number,\"sources_revenus\":[str],\"justification\":str}",
    `PROPOSITION: ${JSON.stringify(proposition)}\nARCHÉTYPE: ${JSON.stringify(archetype)}\nFEATURES: ${JSON.stringify(features)}\nPRIX DES CONCURRENTS: ${JSON.stringify(similaires)}\nREPÈRES MARCHÉ: point de prix le plus fréquent 9,99 $/mois ; l'hebdo pèse 55 % du revenu abo ; annuel médian ~40-100 $.`,
  );
  const businessPlan = calculerBusinessPlan(bpChoix);

  // 4 · Quatre critiques INDÉPENDANTS (une dimension chacun)
  // Les critères s'adaptent à l'archétype (doctrine : une loterie ne se
  // juge pas sur le D30 — elle se juge sur le viral et le risque store).
  const estLoterie = archetype.archetype === "loterie";
  const dims = [
    ["distribution", estLoterie
      ? "La boucle VIRALE est-elle réelle (partage naturel, presse, meme-abilité) ? Sans viralité, une loterie est morte."
      : "Le canal des 100 premiers utilisateurs est-il crédible et répétable ? Une app à 0 avis peut-elle exister face à ce moat d'avis ?"],
    ["produit", estLoterie
      ? "L'app a-t-elle une fonctionnalité RÉELLE (guideline 4.2 minimum functionality) ? Un gimmick vide sera rejeté par la review 2026."
      : "La killer feature justifie-t-elle un switch ? Est-elle copiable en un sprint par l'incumbent ? Le prix d'attaque sous-coté accélère-t-il vraiment le switch ?"],
    ["economie", "Le business plan (prix d'attaque sous-coté, doctrine mieux-pour-moins-cher) tient-il ? LTV vs acquisition organique réaliste ? Commission stores intégrée ?"],
    ["durabilite", estLoterie
      ? "Risque pour le COMPTE développeur (4.3 spam, purge 2026 des apps sans traction) ? Le pic de curiosité passé, l'app est-elle un passif ?"
      : "Besoin récurrent (pas one-shot) ? conscient (pas latent) ? durable (pas un pic) ? Risque sherlocking ?"],
  ];
  const critiques = [];
  for (const [dim, question] of dims) {
    const c = await ia(
      `Tu es un critique indépendant et PESSIMISTE, dimension « ${dim} ». En cas de doute, note BAS. JSON: {"score":int_0_100,"kill":bool,"raison":str,"risques":[str]}`,
      `${question}\nSHERLOCKING DÉTECTÉ PAR CODE: ${JSON.stringify(sherlocking)}\nPROPOSITION FINALE: ${JSON.stringify(proposition)}\nFEATURES DIFFÉRENCIANTES PROPOSÉES: ${JSON.stringify(features)}\nBUSINESS PLAN (projections calculées par code): ${JSON.stringify({ modele: businessPlan.modele, prix: businessPlan.prix_mensuel_usd, seuil_rentabilite: businessPlan.seuil_rentabilite_installs_mois, scenarios: businessPlan.scenarios })}\nCONTEXTE: ${contexte.slice(0, 2000)}`,
    );
    critiques.push({ dimension: dim, ...c });
    await dodo(300);
  }

  // 5 · Verdict PAR CODE
  const { probabilite, verdict, kills } = calculerVerdict(critiques, nbAvis);

  return {
    verdict,
    probabilite,
    dossier: {
      donnees: { nb_plaintes_analysees: nbAvis, manuelle, similaires, donnees_maigres: nbAvis < 10 },
      themes: themes.themes ?? [],
      proposition_finale: proposition,
      features_differenciantes: features,
      archetype,
      business_plan: businessPlan,
      tours_adversariaux: toursAdversariaux,
      sherlocking,
      critiques,
      kills,
      methode: "product-wedge-analysis v1 — verdict calculé par code (distribution ×1,5 ; kill si critique kill ou p<35 ; go si p≥55 et min≥40 ; décote -10 si <30 avis)",
    },
  };
}

// --- main : une idée par passe ---------------------------------------
const verrou = await poserVerrou();
if (!verrou) {
  console.log("run déjà en cours — abandon");
  process.exit(0);
}
try {
  const idees = await sql`
    select i.* from ideas i
    left join viability_reports v on v.idea_id = i.id
    where i.status = 'a_analyser' and v.id is null
    order by i.score desc limit 1`;
  if (idees.length === 0) {
    await fermerVerrou(verrou, "ok", "aucune idée en attente");
    console.log("OK — rien à analyser");
    process.exit(0);
  }
  const idee = idees[0];
  console.log("analyse:", idee.id);
  const { verdict, probabilite, dossier } = await analyser(idee);
  await sql`
    insert into viability_reports (id, idea_id, verdict, probability, dossier, model)
    values (${`vr:${idee.id}`}, ${idee.id}, ${verdict}, ${probabilite}, ${JSON.stringify(dossier)}, ${MODELE})
    on conflict (idea_id) do nothing`;
  await fermerVerrou(verrou, "ok", `dossier ${verdict} (p=${probabilite}) pour ${idee.id}`);
  console.log(`OK — ${idee.id}: ${verdict} (p=${probabilite})`);
} catch (e) {
  await fermerVerrou(verrou, "error", String(e).slice(0, 500));
  console.error("ÉCHEC:", e);
  process.exit(1);
}
