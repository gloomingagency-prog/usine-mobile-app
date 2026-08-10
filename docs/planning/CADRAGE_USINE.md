# Cadrage · L'Usine à apps mobiles

> Livrable de phase 0 — mais l'objet cadré n'est pas UNE app : c'est
> l'usine qui les produit et les exploite. À relire/corriger avant la
> phase d'architecture détaillée (voir `ARCHITECTURE_USINE.md`) et avant
> toute ligne de code. Les données de marché sourcées sont dans
> `ANALYSE_MARCHE.md`.

---

## 0 · Verdict de viabilité (synthèse de l'analyse adversariale)

**Verdict : VIABLE SOUS CONDITIONS — trois conditions non négociables,
encodées dans l'usine elle-même.**

Ce qui rend le projet viable (données dans `ANALYSE_MARCHE.md`) :
- La distribution des revenus des apps est une loi de puissance (~81 %
  des apps à abonnement < 1 000 $/mois ; top 5 % ≈ 400× le bottom 25 %) :
  un portefeuille d'hypothèses à coût marginal faible est la réponse
  rationnelle — à condition de tuer vite et de doubler sur les winners
  (les cas réels le confirment : 1 app fait 70-99 % du revenu des
  portfolios qui réussissent).
- Le coût de production tend vers zéro pour tout le monde (vague vibe
  coding, +60 % de soumissions au T1 2026). **Le moat n'est plus le
  code : c'est le gate de viabilité adversarial + la boucle de run
  mesurée** — produire uniquement ce qui a un wedge, exploiter mieux.
  C'est exactement ce que la concurrence « générateurs d'apps » ne fait
  pas.
- L'infrastructure est mutualisable (châssis, télémétrie, monétisation)
  et le savoir-faire existe déjà en interne (usine ecom DelivUp, trame
  éprouvée).

Les trois conditions (sinon NON VIABLE) :
1. **Jamais d'app sans wedge prouvé** — Apple 4.3 durci (juin 2026 :
   retrait rétroactif des apps sans traction, ban de compte pour
   soumissions répétées de « low-effort apps ») rend le modèle
   « spammer N clones » non seulement perdant mais **fatal au compte
   entier**. Le code de l'usine refuse de créer une app sans verdict
   `go` du gate de viabilité.
2. **Chaque app a son canal de distribution AVANT le build** (ASO de
   niche + un canal organique répétable) — l'UA payante ne ferme pas
   pour l'app médiane (CPI 2-6 $ vs RPI médian 0,31 $).
3. **Cadence maîtrisée, portefeuille discipliné** : max 2 apps en build,
   kill obligatoire des apps sans traction (hygiène du compte), un seul
   compte Apple + un compte Google organisation.

Ce qui ferait pivoter : si après 5-6 apps aucune ne dépasse les seuils
de rétention/revenu de sa catégorie, le problème est le sourcing d'idées
(radar/gate), pas l'usine — pivoter vers l'usine-service (modèle B) qui
monétise l'outillage sans porter le risque de marché.

## 1 · Le problème et la promesse

**Problème** : produire une app mobile rentable est un pari à faible
probabilité (l'écrasante majorité des apps ne dépasse jamais quelques
centaines d'euros par mois — chiffres dans `ANALYSE_MARCHE.md`). Une app
à la fois = un pari à la fois, avec un coût fixe élevé (cadrage, build,
stores, exploitation) et aucune mutualisation de l'apprentissage.

**Promesse** : transformer le pari unitaire en **portefeuille
d'hypothèses falsifiables**. L'usine abaisse radicalement le coût
marginal d'une tentative (radar → gate de viabilité → châssis commun →
build agentique → run autonome), tue tôt et à bas coût ce qui ne marche
pas, et concentre l'humain sur les seuls gates qui comptent : la
viabilité, l'argent, la qualité perçue.

**Mesure de la promesse** (les métriques de vérité de l'usine) :
- délai idée → store : ≤ 3 semaines par app V1 (la trame seule : 4+)
- coût de production d'une app V1 : chiffré et suivi par app (IA +
  builds + stores + temps humain aux gates)
- taux de kill à l'étage viabilité : **élevé = sain** (chaque kill
  économise 3-4 semaines)
- MRR du portefeuille, rétention D1/D7/D30 par app, % d'actions passées
  en auto **sur preuves**

## 2 · Modèle business

Trois modèles possibles — l'usine est la même, le client change :

| Modèle | Revenus | Risques | Verdict proposé |
|---|---|---|---|
| **A · Portfolio propre** | Abonnements/IAP des apps du portefeuille | Marché de chaque app ; cash-flow lent au départ | **Recommandé pour démarrer** : aligné avec la trame, aucun client à servir, chaque app est une hypothèse |
| B · Usine-service (produire des apps pour des clients) | Forfait build + run mensuel | Délais clients, responsabilité stores pour le compte du client, avant-vente | V2 possible une fois l'usine prouvée par le portfolio |
| C · Usine-produit (vendre l'accès à l'usine) | SaaS | Le plus dur : marché des « app builders » saturé et sherlockable | Non-périmètre |

**Décision proposée : A d'abord.** Le portfolio propre est la preuve de
l'usine ; B se vend ensuite avec les résultats de A comme démonstration.

**Modèle de revenu par app** (imposé par le châssis, ajustable par app) :
freemium honnête — le gratuit livre un vrai basique (jamais verrouiller
les basiques), l'abonnement résout une vraie douleur ; RevenueCat pour
l'IAP ; prix par défaut calés sur les benchmarks de la catégorie
(`ANALYSE_MARCHE.md`), tout changement de prix = action « argent » gated.

## 3 · Périmètre

### V1 de l'usine (ce qui doit exister pour la première app)
1. **Cockpit squelette** : auth, table `apps`, machine à états, pipeline
   vivant, file « À traiter », heartbeats + page de statut publique.
2. **Radar v1** : minage d'avis (crons) + scoring par code + file idées.
3. **Gate de viabilité** : agents adversariaux + verdict calculé par code
   + dossier lisible dans le cockpit.
4. **Châssis commun v1** + `create-app` : squelette Expo instancié en
   minutes (Sentry, RevenueCat, PostHog, kit offline, CI EAS).
5. **Build agentique v1** : sessions Claude Code headless maillon par
   maillon + QA + gate humain hebdo sur appareil réel.
6. **Release semi-automatisée** : fiches générées + QA, soumission par
   API, gate humain.
7. **Run v1** : télémétrie centralisée + taxonomie d'actions +
   dispatcher gated + mesure J+7. (Promotion en auto : V1.1, une fois
   les premières mesures accumulées.)

**Règle de construction : l'usine se construit EN produisant sa première
app.** Jamais 3 mois d'usine sans app — la première app pilote traverse
chaque étage dès qu'il existe et le valide en réel (c'est le « maillon
testé en réel » de la trame, appliqué à l'usine elle-même).

### V2
- Promotion/rétrogradation automatique des pouvoirs (gate outillé).
- Étage portfolio complet (seuils kill/scale, réallocation budget).
- Apple Search Ads automatisé (dossiers chiffrés).
- Modèle B (usine-service) si le portfolio a prouvé.

### Non-périmètre (explicite)
- Vendre l'usine en SaaS (modèle C).
- Jeux à moteur natif (Godot) — le châssis est Expo ; un jeu casual
  Phaser-dans-WebView reste possible.
- Toute action « argent » en auto-exécution — **jamais**, par
  construction.

## 4 · Contraintes stores (le gate externe qui dimensionne tout)

Détail sourcé dans `ANALYSE_MARCHE.md`. Ce qui contraint la conception :

1. **Apple 4.3 (spam/templated) est le risque existentiel de l'usine.**
   Un flot d'apps similaires = rejets puis **ban du compte** (toutes les
   apps mortes d'un coup). Parades par construction : killer feature
   obligatoire (le code refuse de créer une app sans verdict `go`),
   chartes visuelles distinctes, cadence de publication maîtrisée,
   qualité pré-review (checklist pré-store de la trame automatisée).
2. **La review est un gate humain** : chaque soumission engage la
   réputation du compte — jamais d'auto-submit.
3. **Google Play** : un compte personnel neuf subit le test fermé
   obligatoire (12 testeurs opt-in, 14 jours continus) ; un compte
   **ORGANISATION (D-U-N-S) en est exempté** → compte organisation
   obligatoire, créé tôt (la vérification développeur universelle
   Android arrive en septembre 2026).
4. **Data safety / privacy** : générées par le châssis, déclarées
   honnêtement, revues au gate de release.
5. **Commissions 15/30 %** intégrées aux unit economics (Small Business
   Program tant que < 1 M$).

## 5 · Risques et parades

| Risque | Gravité | Parade |
|---|---|---|
| Ban de compte développeur (spam 4.3) | Fatale | Killer feature obligatoire par code ; gate humain soumission ; cadence maîtrisée ; qualité pré-review |
| L'usine tourne à vide (actions texte libre) | Élevée | Taxonomie fermée + dispatcher + mesures — par construction (pattern ecom) |
| Sur-construction de l'usine avant preuve | Élevée | Première app pilote dès l'étage 4 ; WIP limit : max 2 apps en build |
| Coûts fixes qui explosent (N × Supabase/EAS/outils) | Moyenne | Chiffrage par app dans le cockpit ; plafond mensuel ; choix d'infra dans l'audit (voir décisions) |
| Crons muets / surveillance aveugle | Élevée (vécu : 16 j) | Statut public, heartbeats, silencieux > 2× cadence = panne critique |
| Apps me-too sans distribution | Élevée | Gate viabilité : canal des 100 premiers utilisateurs AVANT build — sinon kill |
| Sherlocking d'une app du portfolio | Moyenne | Check sherlocking codé à l'étage 1 ; portefeuille diversifié |
| Quotas plans gratuits (EAS, Vercel…) | Moyenne | Quotas listés AVANT le premier maillon (règle trame) ; VPS pour le lourd |

## 6 · Décisions à valider (avant l'audit détaillé)

- **D1 · Modèle business** : A (portfolio propre) d'abord — B en V2.
  *Proposition : oui.*
- **D2 · Compte(s) développeur** — DÉCIDÉ (utilisateur, 2026-08-10) :
  **Google d'abord (prochainement), Apple dans un second temps**, sans
  blocage. Conséquences : la première app sort **Android d'abord**
  (test interne Play au lieu de TestFlight) ; prendre un compte Google
  **organisation avec D-U-N-S** (25 $ une fois — l'organisation échappe
  à la règle des 12 testeurs/14 jours, et la vérification universelle
  Android de sept. 2026 approche) ; le châssis reste 100 % cross-platform
  pour que la sortie iOS soit un build + une fiche, pas un chantier.
  Jamais de comptes multiples (ban par association, Apple 5.6.2 /
  Google related accounts).
- **D3 · Structure de code** : monorepo usine (cockpit + packages +
  châssis) et **un repo par app** généré depuis le châssis.
  *Proposition : oui — une app reste jetable/vendable individuellement.*
- **D4 · Backend des apps** : par défaut **local-first sans backend**
  quand le concept le permet (coût marginal ≈ 0, offline parfait — le
  modèle du cas Röhl/HabitKit, 602 k$/an sans serveur) ; sinon un
  backend isolé par app (Supabase ou Neon+API) — jamais le backend de
  l'usine. *À trancher app par app dans l'audit ; le châssis doit
  supporter les deux modes.*
- **D4bis · Base du cockpit** : **Next.js + Neon** — DÉCIDÉ
  (utilisateur, 2026-08-10). Accès base uniquement côté serveur, rôles
  vérifiés par route, migrations + scripts idempotents.
- **D4ter · Framework des apps** : **React Native + Expo** — DÉCIDÉ
  (choix délégué par l'utilisateur, tranché sur veille du 2026-08-10,
  détail volet frameworks de `ANALYSE_MARCHE.md`) : équipe React/TS,
  meilleur codegen IA (l'usine est agentique), OTA le plus conforme
  (Apple 3.3.1(B) couvre explicitement le JS via JavaScriptCore),
  chaîne EAS unifiée multi-projets (25 apps en Free, 100 en
  Production), `expo-updates` self-hostable. Réserve : Flutter +
  Shorebird ; critères de bascule documentés dans l'analyse.
- **D5 · Orchestrateur** : la recherche outillage recommande **Inngest**
  (retries par step, `waitForEvent` en jours = gates humains natifs,
  free 50k exéc/mois) ou Trigger.dev self-hosted comme MOTEUR du
  pipeline, avec n8n (déjà maîtrisé) en glue/intégrations légères.
  *Proposition : démarrer avec n8n seul (capitaliser sur l'existant,
  les gates passent déjà par la base + files « À traiter ») et ne
  sortir Inngest que si les pipelines longs le réclament — commencer au
  niveau le plus bas qui marche.*
- **D6 · Niches cibles du radar au lancement** : 2-3 catégories à
  incumbents faibles (critères de la skill wedge) — proposition dans
  `ANALYSE_MARCHE.md`.
- **D7 · Budget** — DÉCIDÉ (utilisateur, 2026-08-10) : budget serré ;
  **première app ≤ 50-100 $** au total (hors frais de comptes
  développeur), marketing seulement si besoin justifié (dossier chiffré,
  gate argent). Tenable en free-tier : voir « Dépenses réelles d'une
  app » ci-dessous — le seul poste variable à surveiller est les tokens
  IA du build agentique, suivis par app dans le cockpit.
- **D8 · Appareil bas de gamme de référence** pour les tests réels
  (règle trame : un vrai Android à ~200 € + un iPhone).

## 6bis · Dépenses réelles d'une app (hors marketing, hors comptes dev)

Réponse à la question « de quelles dépenses parle-t-on ? » — pour une
app du portfolio, en démarrant free-tier partout :

| Poste | Coût 1ère app | Quand ça devient payant |
|---|---|---|
| **Tokens IA (build agentique)** | **le poste principal** : ~10-40 $ selon la taille de l'app (~13 $/jour actif observé) | croît avec l'ambition de l'app — suivi par app dans le cockpit |
| Builds cloud EAS | 0 $ (free : 15 Android + 15 iOS/mois) | 1-4 $/build au-delà, ou Starter 19 $/mois quand plusieurs apps buildent |
| Backend | 0 $ (local-first ; sinon Neon free = 100 projets) | quasi jamais pour une micro-app |
| Sentry / PostHog / RevenueCat | 0 $ (5k erreurs / 1 M events / < 2 500 $ MTR) | RevenueCat : 1 % du MTR au-delà — un « bon » problème |
| Assets (icône, screenshots) | ~1-5 $ (génération API + capture Maestro) | — |
| ASO tooling | 0 $ (scrapers + RSS) | Appfigures 9,99 $/mois si besoin d'échelle |
| Stores | Google 25 $ (une fois) ; Apple 99 $/an **différé** (D2) | — |
| Infra usine (VPS, mutualisé) | ~10-20 €/mois pour TOUT le portfolio, pas par app | — |

**Total première app : ~15-50 $ de variable + 25 $ de compte Google —
le budget ≤ 100 $ tient.** Le marketing est bien le seul poste qui peut
dépasser, et il est gated par construction (action argent → dossier
chiffré → validation humaine). La doctrine reste organique d'abord
(ASO de niche + un canal organique répétable, exigés au gate de
viabilité) ; Apple Search Ads seulement en chirurgical, plus tard.

## 7 · Métriques de vérité (mesurables dès la V1)

- **Usine** : délai idée→store, coût par app, taux de kill étage 1,
  uptime des crons, % actions auto (gagnées sur preuves), coût IA par
  tâche.
- **Par app** : D1/D7/D30 (cibles par catégorie dans l'analyse),
  conversion trial→payant, MRR, crash-free rate, note store, temps de
  démarrage < 2 s, app < 50 Mo, 60 fps sur l'appareil de référence.
- **Portefeuille** : MRR total, nombre d'apps live / en build / tuées,
  ratio revenus/coûts fixes mensuels.
