# Analyse de marché · Usine à apps mobiles

> Recherches web menées le 10 août 2026 (3 volets : règles des stores,
> économie des portfolios d'apps, outillage d'automatisation). Chaque
> fait porte sa source et sa date. Les points non vérifiés sont signalés
> — ils ne fondent aucune décision.

---

## Volet 1 · Règles des stores 2026 pour un éditeur multi-apps

### Apple — le cadre s'est durci en juin 2026

- **4.3(a) Spam** : interdiction directe du « même app, N bundle IDs ».
  **4.3(b)** : les catégories saturées (fonds d'écran, timers, sons…)
  n'acceptent plus de soumission sans « meaningfully different or
  improved experience » ; depuis la mise à jour du **9 juin 2026**,
  Apple peut **retirer rétroactivement** des apps sans mise à jour ni
  traction, et « repeated submissions of this kind may lead to removal
  from the Apple Developer Program »
  (developer.apple.com/app-store/review/guidelines/, consulté
  2026-08-10 ; macrumors.com/2026/06/09/app-store-guidelines-low-quality-apps/, 2026-06-09).
- **4.2 Minimum functionality** : les wrappers minces (site web ou API
  IA reconditionnés) sont rejetés (developer.apple.com, consulté
  2026-08-10).
- **4.2.6 Templates** : une app issue d'un template/service de
  génération est rejetée **sauf si soumise par le propriétaire du
  contenu** — le modèle « usine qui publie pour des clients depuis un
  compte unique » est interdit ; chaque client doit publier sous SON
  compte (developer.apple.com, consulté 2026-08-10).
- **IA** : depuis le 13 novembre 2025, la guideline 5.1.2(i) impose
  divulgation + consentement avant tout partage de données personnelles
  avec une IA tierce (techcrunch.com, 2025-11-13). Mise à jour globale
  des guidelines le 8 juin 2026 (safety, IA, qualité, identité
  développeur) (developer.apple.com/news/?id=ey6d8onl, 2026-06-08).
- **Ban de compte** : la résiliation frappe TOUTES les apps du compte et
  s'étend aux comptes liés (5.6.2 — mêmes coordonnées, banque,
  appareils). Multiplier les comptes est le risque, pas la parade.
- **Aucune limite officielle de nombre d'apps** par compte — le critère
  est la similarité et la qualité, pas le volume. Aucun seuil chiffré
  officiel n'existe (tout seuil circulant est anecdotique).

### Google Play — vérifications lourdes pour les nouveaux comptes

- **Comptes personnels** (créés après le 13 nov. 2023) : test fermé
  obligatoire avec **12 testeurs opt-in en continu pendant 14 jours**
  avant l'accès production (support.google.com/googleplay/android-developer/answer/14151465,
  consulté 2026-08-10). **Les comptes ORGANISATION (D-U-N-S) en sont
  exemptés** — quasi indispensable pour une usine.
- Frais : 25 $ une fois. Vérification : D-U-N-S + infos légales +
  identité (android-developers.googleblog.com, 2023-07).
- **Septembre 2026** : vérification développeur obligatoire pour toutes
  les apps Android (y compris sideloading), déployée depuis mars 2026
  (9to5google.com, 2025-08-25) — créer/valider le compte tôt.
- **Repetitive content** : interdiction de « many similar apps under one
  developer account » ; enforcement jusqu'à la résiliation du compte et
  des comptes liés (support.google.com/googleplay/android-developer/answer/9899234).

### Frais, délais, commissions (2026)

| Poste | Valeur | Source (consultée 2026-08-10) |
|---|---|---|
| Apple Developer Program | 99 $/an | magora-systems.com/apple-developer-fee/ |
| Google Play | 25 $ une fois | support.google.com (answer/13628312) |
| Review Apple | 24-72 h typique, 7-10 j cas sensibles | weareaffective.com |
| Review Google | 1-7 j (établi), 7-14 j (nouveau compte) | ptkd.com/journal/google-play-review-time |
| Commission | 15 % < 1 M$/an (les deux stores), 30 % au-delà | revenuecat.com ; qonversion.io |

- **Paiements externes** : aux US, liens externes autorisés depuis
  l'injonction du 30 avril 2025 ; le 9e Circuit (11 déc. 2025) autorise
  Apple à percevoir une « commission raisonnable » dont le taux reste à
  fixer (affaire montée en Cour suprême le 6 avril 2026) — situation
  **instable**, ne pas fonder le business dessus. En UE (DMA, refonte du
  26 juin 2025) : liens externes possibles avec frais totaux ~12-20 %
  (2 % acquisition + Store Services 5-13 % + Core Technology 5 %)
  (macrumors.com 2025-06-26 ; revenuecat.com 2025-07). Obligation DSA :
  statut de commerçant déclaré avant publication UE (les apps sans
  statut ont été retirées en février 2025).
- **Non vérifié** (signalé par la recherche, à recouper) : seuil
  quantitatif de déclenchement 4.3, limite de publication Google
  (~15 apps/jour évoquée en communauté), restructuration Google
  « service fee + billing fee » du 30 juin 2026 (une seule source),
  bascule CTF→CTC effective en UE.

### Conséquences pour la conception de l'usine (fondent le cadrage)

1. **Le volume n'est pas le risque, la similarité l'est** : chaque app
   doit être fonctionnellement différenciée (killer feature vérifiée au
   gate de viabilité — le code refuse de builder sans).
2. **Une app sans traction devient un passif** (retrait rétroactif
   4.3(b) depuis juin 2026) : le kill d'app n'est pas optionnel, c'est
   une obligation d'hygiène du compte → étage portfolio (sunset) requis
   dès la V1.
3. **UN compte Apple + UN compte Google ORGANISATION** (D-U-N-S), créés
   et vérifiés tôt (la vérification universelle Android de sept. 2026
   arrive). Jamais de comptes multiples.
4. **Le modèle « usine-service » (apps de clients) impose que chaque
   client publie sous son propre compte** (4.2.6) — l'usine outille,
   elle ne publie pas à leur place. Confirme le choix « portfolio
   propre d'abord » (D1 du cadrage).
5. Monétisation : rester sur IAP + programmes 15 % (< 1 M$) ; les liens
   externes US/UE sont une optimisation ultérieure, pas un fondement.

---

## Volet 2 · Économie des portfolios d'apps (2025-2026)

### La distribution des revenus est une loi de puissance brutale

- **~81 % des apps à abonnement n'atteignent jamais 1 000 $/mois** dans
  leurs deux premières années ; 3,5 % atteignent 10 000 $/mois
  (RevenueCat State of Subscription Apps — dataset 115 000+ apps,
  16 Md$ ; revenuecat.com/state-of-subscription-apps, mars 2026 ;
  techcrunch.com 2024-03-12).
- **Concentration croissante** : le top 5 % des apps lancées gagne
  ~400× le bottom 25 % après un an ; top 10 % : +306 % de croissance
  quand la médiane fait +5,3 % (revenuecat.com, mars 2026).
- Revenu par install médian à 60 jours : **~0,31 $** (0,63 $ pour les
  apps IA) (revenuecat.com, mars 2025).
- Effet « escalier » : parmi les apps qui atteignent 1 000 $/mois, 59 %
  atteignent 2 500 $ (digitalinformationworld.com, mars 2024).

**Lecture** : le modèle portfolio est LA réponse rationnelle à cette
distribution — multiplier les tirages à coût marginal minimal, tuer
vite, doubler sur la winner. C'est exactement ce que l'usine outille.

### Cas documentés de portfolios indés (⚠ biais du survivant, chiffres autodéclarés)

- **Sebastian Röhl** (solo, 4 apps) : 602 000 $ en 2025, ~28 k$ MRR —
  mais **HabitKit fait ~99 % du revenu** ; le portfolio a servi à
  trouver la winner, pas à empiler des revenus uniformes
  (sebastianroehl.substack.com, jan. 2026).
- **Max Artemov** (solo, ~28-30 apps en < 1 an) : ~22-25 k$ MRR,
  monétisation pub, une app/semaine, distribution TikTok slideshows
  (indiehackers.com, 2025 — non audité).
- **Cal AI** (1 app) : 0 → 30 M$ ARR fin 2025 via 250+ influenceurs
  TikTok/IG sous retainer, racheté par MyFitnessPal
  (superframeworks.com, 2026). Référence du canal UGC.
- Règle empirique observée : **10-15 % des apps d'un portfolio font
  70-80 % du revenu** (cohérent avec la loi de puissance RevenueCat).

### Acquisition 2026 : l'UA payante classique est perdante pour l'app médiane

- La recherche store pilote **~65 % de la découverte iOS** (~58 % Play)
  (digitalapplied.com, 2026) — mais +60 % de nouvelles apps au T1 2026
  (vague IA), cap probable de 1 M de nouvelles apps en 2026
  (techcrunch.com, 2026-04-18) : l'organique par défaut tend vers zéro
  sans wedge ASO.
- CPI T1 2026 : **~5,84 $ iOS / ~1,92 $ Android** ; TikTok ~1,75-4 $ ;
  **Apple Search Ads : CPT ~2,25 $, CPA ~2,51 $** — le canal payant le
  plus pertinent pour des micro-apps (intention forte, petit budget)
  (digitalapplied.com ; apptweak.com, 2026).
- Avec un RPI médian de 0,31 $ et des CPI de 2-6 $, **l'équation UA
  payante ne ferme pas pour l'app médiane** → doctrine : ASO-first sur
  niches + un canal organique répétable (TikTok/Reddit) + Apple Ads
  chirurgical. Le gate de viabilité exige le canal AVANT le build.

### Monétisation : benchmarks à encoder dans le châssis

- **Paywall dur à l'onboarding : ~10,7-12 % de conversion
  download→payant vs ~2,1 % en freemium** (~5×), rétention 1 an quasi
  identique ; RPI J60 : 3,09 $ vs 0,38 $ (revenuecat.com, mars 2026).
- Essais longs convertissent mieux : 17-32 jours ≈ 42,5 % trial→payant
  vs 25,5 % pour < 4 jours (revenuecat.com, 2026).
- **Renouvellement annuel : 83,4 %/période** (~2× mensuel, ~4× hebdo) ;
  mais l'hebdo génère désormais **55,5 % du revenu d'abonnement** et le
  mensuel est devenu le pire plan (airbridge.io/adapty.io, 2026).
- Prix : point le plus fréquent 9,99 $ ; médianes ~7,5 $/sem.,
  12,99 $/mois, 38-104 $/an selon source (businessofapps.com ;
  airbridge.io, 2026).
- Rétention d'usage agrégée 2026 : **D1 ~25 %, D7 ~12 %, D30 ~5-7 %** ;
  top quartile : D1 > 30 %, D7 > 15 %, D30 > 8 % (Adjust via
  core-mba.pro, 2026) — cibles par défaut des apps du portfolio.
- Churn involontaire (échecs de facturation) : 31 % des annulations sur
  Play, 14 % sur iOS (revenuecat.com, 2026).

### Niches : saturé / ouvert / sherlocking

- **Saturé** : photo-avatar IA (flots de clones, churn maximal),
  hypercasual pur (déclin, UA hors de portée d'un solo — seul
  l'hybrid-casual croît : +20 % IAP, Sensor Tower 2026), productivité
  et fitness génériques.
- **Réputé ouvert** : verticalisation fine (« habit tracking pour X »
  plutôt que « productivité »), finance verticale (freelances,
  locatif), publics sous-servis (seniors, pet owners), santé/habitudes
  (meilleure conversion, terrain des deux plus gros succès indés cités).
- **Sherlocking WWDC 2025** (cru record) : suivi de vols (Flighty),
  filtrage d'appels (Truecaller), tracking de colis, enregistrement
  local… (techcrunch.com, 2025-06-10). Les utilitaires mono-fonction
  proches de l'OS = zone de risque maximale ; les apps à données
  accumulées/communauté/verticale résistent mieux. → le check
  sherlocking codé de l'étage 1 est confirmé comme indispensable.

### La vague « vibe coding » change la nature du jeu

- Soumissions : +60 % YoY au T1 2026 (+80 % iOS), reviews Apple
  rallongées (14-45 jours rapportés, forbes.com 2026-03-24), blocages
  d'apps de vibe coding mi-mars 2026 (guideline 2.5.2, thenextweb.com).
- **Conséquence stratégique** : le coût de production tend vers zéro
  pour tout le monde — la valeur se déplace vers la **distribution, la
  différenciation et la donnée accumulée**. Le code n'est plus un moat.
  L'avantage de NOTRE usine n'est pas « produire vite » (tout le monde
  le peut désormais) : c'est le **gate de viabilité adversarial + la
  boucle de run mesurée** — produire uniquement ce qui a un wedge
  prouvé, puis l'exploiter mieux.

### Biais méthodologiques assumés

Benchmarks RevenueCat/Adapty = apps à abonnement instrumentées (la
réalité toutes-apps est pire) ; cas de portfolios = survivants
autodéclarés ; introuvables : revenu médian toutes-monétisations 2026,
étude systématique des studios 5-30 apps, liste sherlocking WWDC 2026.

---

## Volet 3 · Outillage d'automatisation (2026)

> Convention : [vérifié] = source primaire/officielle consultée le
> 10/08/2026 ; [secondaire] ; [non trouvé]. Détail complet des sources
> dans le rapport de recherche (URLs citées ci-dessous par domaine).

### Build & release — presque tout est automatisable, sauf deux verrous

- **EAS (expo.dev/pricing, vérifié)** : Free = 15 builds Android + 15
  iOS/mois, 1 000 MAU d'EAS Update ; **Starter 19 $/mois** (45 $ de
  crédit build) ; builds à l'unité 1-4 $. Monorepo multi-apps supporté
  officiellement (un `eas.json` + `app.config.ts` à variantes par app,
  variables d'env par projet).
- **App Store Connect API v4.4.1 (vérifié)** : metadata, screenshots,
  soumission review, réponses aux avis, IAP, TestFlight, webhooks
  (2026). **MAIS : pas d'endpoint de CRÉATION d'app** (fastlane
  `produce` = API non officielle, fragile).
- **Google Play Developer API (vérifié)** : Edits API (AAB, tracks,
  listings, images), Reply to Reviews (⚠ avis des 7 derniers jours
  seulement, réponse ≤ 350 caractères, 2 000 POST/jour). **Pas de
  création d'app par API** non plus.
- **Verrous incompressibles** (à faire à la main, une fois par app :
  ~10 min) : création de l'app dans ASC/Play Console, accords, banque,
  taxes, Data safety form. Tout le reste se scripte.
- fastlane : vivant (v2.237.0, Mobile Native Foundation) — utile pour
  `deliver`/`supply` (metadata en masse).

### Agentique — le build headless est mûr

- **Claude Agent SDK / Claude Code headless (vérifié)** : `claude -p
  --bare` en CI (sorties JSON avec coût par session, `--json-schema`,
  sessions reprenables), subagents, hooks, GitHub Action officielle
  (mode automation + cron). Coût observé ≈ 13 $/jour actif/dév.
- Patterns « agentic software factory » documentés (freeCodeCamp
  2026-05-22, codecentric 2026-06-22) : couches d'agents + gates
  humains. **[non trouvé]** : cas public chiffré d'un portfolio d'apps
  100 % agentique — notre usine serait en avance, pas en retard.
- **Orchestrateurs** (pipelines longs, retries, gates humains) :
  Temporal (le plus robuste, coût d'ingénierie élevé), **Inngest**
  (waitForEvent en jours, retries par step, free 50k exéc/mois —
  meilleur compromis serverless), Trigger.dev (équivalent, self-host
  Apache 2.0), n8n (glue low-code + gates simples, gratuit self-hosted).

### Backends & coûts par app — l'argument Neon s'étend aux apps

- **Supabase (vérifié)** : Pro 25 $/orga/mois mais **chaque projet
  coûte min ~10 $/mois** (compute Micro) → 20 apps ≈ 215 $/mois.
- **Neon (vérifié)** : **100 projets même en Free**, scale-to-zero →
  0 à quelques $ pour 20 petites bases. Turso : 100 DB free.
  PocketBase self-hosted (VPS) : ~10 $ pour N instances.
- → cohérent avec la décision cockpit : **Neon partout** (cockpit +
  backends d'apps quand un backend est nécessaire), apps local-first
  sans backend par défaut.

### Observabilité portfolio (vérifié)

- **Sentry** : projets ILLIMITÉS sur tous plans, Team 26 $/mois ; API
  org-wide (stats groupées par projet en 1 appel).
- **PostHog** : 1 M events gratuits/mois ; ⚠ **6 projets max par orga
  en pay-as-you-go** — au-delà de 6 apps : un projet mutualisé avec
  propriété distinctive `app_id`, ou plan supérieur.
- **RevenueCat** : **gratuit jusqu'à 2 500 $ de MTR/mois puis 1 % du
  MTR** ; 1 projet par app pour des métriques séparées ; API v2
  Charts/Metrics (⚠ 25 req/min — cacher) + webhooks + export ETL.
- Vérité comptable : ASC `salesReports` + rapports financiers Play
  (bucket GCS). → le cockpit agrégé par pulls cron + webhooks est
  faisable et bien supporté.

### ASO & avis (vérifié)

- Nos apps : APIs officielles (Apple : historique complet + réponses ;
  Google : fenêtre 7 jours → cron quotidien obligatoire).
- Marché : `google-play-scraper` npm actif (v10.1.3, 2026-05) ; RSS
  Apple vivant mais **500 avis max/app/pays** ; scraping Apple interdit
  par leurs ToU → risque contractuel, pas pénal : throttling, jamais
  depuis l'infra liée au compte développeur, repli API commerciale
  (**Appfigures 9,99 $/mois**, Asolytics 59 $/mois).
- Réponses aux avis générées par IA : pas d'interdiction explicite
  trouvée — consensus : brouillon IA + validation humaine (notre gate).

### Assets stores (vérifié)

- Screenshots : iPhone 6.9" 1320×2868 requis, iPad 13" si support ;
  Play : feature graphic 1024×500, min 2 screenshots. Capture
  automatisée : **Maestro** (`takeScreenshot`, multi-locales en CI).
- Icônes : un PNG 1024×1024 → Expo décline tout ; génération par API
  (gpt-image, Recraft SVG). ⚠ iOS 26 « Liquid Glass » (`.icon` via
  Icon Composer) : pas d'automatisation CLI trouvée — étape manuelle.
- Textes de fiche : limites Apple 30/30/170/4000/100 (nom/sous-titre/
  promo/description/keywords), Google 30/80/4000 ; pas d'interdiction
  du texte généré par IA — exigence = exactitude (2.3 Apple).

### Frameworks mobiles 2026 — le choix pour l'usine (veille du 10/08/2026)

Comparaison menée sur : React Native/Expo, Flutter, Kotlin Multiplatform,
et les entrants 2024-2026 (Lynx de ByteDance, Skip, Capacitor).

- **React Native + Expo** : New Architecture obligatoire depuis RN 0.83 /
  SDK 55 (le grief historique des perfs du bridge est éliminé) ; RN 0.85
  (avril 2026) stable par défaut (pkgpulse.com ; expo.dev/changelog).
  EAS : plans par ORGANISATION couvrant 25 projets en Free, 100 en
  Production — modèle aligné « beaucoup de petites apps, peu de builds
  chacune » ; white-label/multi-variantes documenté officiellement de
  bout en bout ; protocole `expo-updates` ouvert → OTA self-hostable
  (coût → 0).
- **OTA et conformité** : la clause Apple 3.3.1(B) (révisée oct. 2025)
  autorise explicitement le code interprété téléchargé exécuté par
  WebKit/**JavaScriptCore** — le cas exact des bundles JS de RN/Expo.
  Shorebird (patchs Dart, interpréteur propriétaire) fonctionne mais
  repose sur une lecture moins littérale de la règle (otakit.app ;
  bitrise.io, 2026).
- **Codegen IA — l'angle décisif pour une usine agentique** : corpus
  JS/TS très supérieur, SDK IA JavaScript-first ; les LLM produisent sur
  Flutter des mélanges de syntaxes obsolètes (sources comparatives
  2026). Un pipeline agentique en TS partage langage, lint, tests et
  packages avec les apps produites.
- **Flutter** (3.44/Dart 3.12, I/O 2026) : écosystème le plus dynamique
  en volume (~28 % des nouvelles apps iOS), Shorebird = OTA multi-apps
  au meilleur prix (apps illimitées dès 0 $) — mais chaîne à assembler
  (Codemagic + Shorebird + fastlane), Dart orthogonal à l'équipe, et
  codegen IA en retrait.
- **KMP** : stable iOS depuis mai 2025, adoption 7 %→18 % (JetBrains
  oct. 2025) mais **pas d'OTA** et stack orthogonale — éliminé.
  **Lynx** : immature hors ByteDance — veille. **Skip** : exige Swift —
  hors profil. **Capacitor/Ionic** : produits commerciaux (Appflow) en
  cours d'arrêt — signal négatif fort.

**Recommandation : React Native + Expo** (5 cases cochées : équipe
React/TS, codegen IA, OTA conforme, chaîne unifiée pilotable en CI,
coûts par organisation multi-projets). **Réserve : Flutter + Shorebird +
Codemagic.** **Critères de bascule** : qualité du codegen Dart rejoint le
TS ET (le coût OTA devient dominant sans volonté de self-host, OU Apple
durcit 3.3.1(B) au-delà de WebKit/JavaScriptCore — non signalé à date).

### Budget mensuel de l'usine (ordre de grandeur, hors IA)

| Poste | Coût/mois |
|---|---|
| EAS Starter | 19 $ |
| Sentry Team | 26 $ |
| PostHog | 0 $ (< 1 M events) |
| RevenueCat | 0 $ (< 2 500 $ MTR) puis 1 % MTR |
| Neon (cockpit + backends) | ~0-20 $ |
| VPS usine (crons, agents) | ~10-20 € |
| Appfigures (ASO) | 10 $ |
| Apple Developer | 8,25 $ (99 $/an) |
| **Total plancher** | **≈ 75-100 $/mois** + tokens IA (~13 $/jour actif) |
