# Architecture · L'Usine à apps mobiles

> Livrable de conception — à relire et corriger avant toute ligne de code.
> Ce document industrialise la trame `TRAME_PROJET_MOBILE/` : ce que les
> prompts 00→05 font pour UNE app, l'usine le fait pour un PORTFOLIO,
> avec le niveau d'autonomie décrit dans `PATTERN_USINE_AGENTIQUE.md`.

**Principe directeur, non négociable (hérité de l'usine ecom) :
l'IA argumente, le CODE tranche, l'HUMAIN valide l'argent.**

---

## 1 · Ce que l'usine EST (et n'est pas)

L'usine est un système qui fait traverser à chaque idée d'app un pipeline
en 7 étages — du radar de marché à l'exploitation autonome — avec :

- des **agents IA** qui analysent, rédigent, construisent et diagnostiquent ;
- du **code déterministe** qui score, valide, exécute et mesure ;
- des **gates humains outillés** partout où il y a de l'argent, un risque
  de compte développeur, ou une sortie client-facing ;
- un **dashboard central** (le cockpit) d'où tout s'administre.

Elle n'est PAS : un générateur d'apps templated sans différenciation
(c'est exactement ce qu'Apple rejette en guideline 4.3 — voir
`ANALYSE_MARCHE.md`), ni un agent en roue libre qui publie seul sur les
stores.

## 2 · La machine à états d'une app (colonne vertébrale)

Chaque app du portfolio est une ligne dans la table `apps` avec un statut
explicite. Les transitions sont les étages du pipeline ; qui a le droit de
faire quelle transition est encodé (SOP = code) :

```
idea → analyzing → { killed | pivot → analyzing | viable }
viable → scoping → building → internal_testing → store_review
store_review → { rejected → building | live }
live ⇄ improving (boucle de run permanente)
live → sunset_proposed → sunset          (kill par preuves, gate humain)
```

Toute transition importante = une ligne d'historique (`app_events`).

## 3 · Les 7 étages du pipeline

### Étage 0 — Radar (sourcing d'idées) `[CRON + IA + CODE]`
- Crons quotidiens : minage d'avis 1-3★ de catégories cibles
  (scrapers stores + RSS Apple), suivi de keywords/volumes ASO,
  veille tendances.
- L'IA **classe** les plaintes en thèmes ; le CODE **score**
  (fréquence × faiblesse des incumbents × faisabilité × récurrence
  du besoin) — jamais un chiffre décisif laissé à l'IA.
- Sortie : file « Idées » triée par score dans le dashboard.

### Étage 1 — Gate de viabilité `[IA adversariale + CODE + HUMAIN]`
Implémentation directe de la skill `product-wedge-analysis` :
1. Minage des plaintes réelles (avis 1-2★, citations, fréquences).
2. Teardown des incumbents (prix, notes, pires plaintes, forme du moat).
3. Check sherlocking (le besoin est-il couvert ou absorbable par l'OS ?)
   contre une liste codée des capacités natives iOS/Android.
4. Les 3 filtres de durabilité : récurrent (pas one-shot), conscient
   (pas latent), durable (pas un pic).
5. Killer feature nommée + critères d'acceptance testables.
6. ≥ 3 tours adversariaux + 4 critiques indépendants (distribution,
   produit, économie, durabilité) → probabilité agrégée **par code**.
7. Verdict `go / pivot / kill` calculé par seuils. `go` → **gate humain**
   (dossier complet : wedge, plaintes citées, canal des 100 premiers
   utilisateurs, killer feature). Un kill est un succès comptabilisé.

### Étage 2 — Cadrage & architecture générés `[IA + HUMAIN]`
- Agents génèrent `CADRAGE.md`, `AUDIT_PRE_IMPLEMENTATION.md` et le
  `CLAUDE.md` de l'app depuis les templates de la trame, pré-remplis
  avec les données de l'étage 1.
- Relecture humaine obligatoire (comme la trame l'exige) — mais l'humain
  relit un document déjà instruit, il ne le rédige pas.

### Étage 3 — Build agentique `[AGENTS + CI + HUMAIN hebdo]`
- Chaque app naît du **châssis commun** (§5) : squelette Expo qui
  compile, Sentry branché, CI qui build — le « maillon 1 » de la trame
  devient un `create-app` de quelques minutes.
- Des sessions Claude Code headless construisent maillon par maillon,
  sous les règles du `CLAUDE.md` généré ; chaque maillon = build de dev
  + tests + commit.
- **Gate humain hebdomadaire** : test sur appareil réel (le simulateur
  ment) + release interne TestFlight/Play — l'humain teste, l'usine
  intègre les retours (chaque rejet devient une contrainte machine).
- Agents QA (phase 4 de la trame) sur chaque chaîne de génération.

### Étage 4 — Release stores `[CODE + HUMAIN]`
- Fiches stores (textes localisés, screenshots, data safety) générées
  puis passées au QA anti-invention (ne jamais promettre ce qui n'est
  pas codé — ancrer sur le LIVRÉ).
- Metadata et binaires poussés par API (EAS Submit, App Store Connect
  API, Play Developer API).
- **La soumission est un gate humain** : un rejet coûte des jours et un
  pattern de rejets met le COMPTE en danger — risque de niveau
  « argent ».

### Étage 5 — Run autonome (la boucle du pattern) `[la boucle complète]`
Par app live, la boucle diagnostic → action → mesure → promotion :
- **Télémétrie centralisée** : webhooks RevenueCat (revenus), PostHog
  (rétention D1/D7/D30, entonnoirs), Sentry (crashs), avis stores
  (cron), positions ASO.
- **Diagnostic** (cron + IA) : l'IA choisit des actions dans la
  **taxonomie fermée** (§4) + params ; le code valide (`estCodeAction`).
- **Dispatcher** : exécute seulement si `executable && !argent` et
  pouvoir revalidé **en base à l'instant de l'exécution** ; une
  exécution par code et par passe ; tout journalisé.
- **Mesure J+7** contre snapshot pris avant l'action → verdict par code.
- **Promotion/rétrogradation par preuves** : min N mesures, zéro
  négative, taux ≥ seuil → l'humain octroie (réversible).

### Étage 6 — Portfolio management `[CODE + HUMAIN]`
- Seuils de kill/scale **écrits et calculés** (ex. à J+90 : D30 < seuil
  ET revenu < seuil ET tendance plate → `sunset_proposed` avec dossier
  chiffré : coûts engagés, revenus, rétention, verdict recommandé).
- Réallocation de budget (pub, features) = action argent → gate.
- Le portefeuille équilibre : N apps en run / M en build / file d'idées.

## 4 · Taxonomie fermée d'actions (v1)

L'IA ne propose JAMAIS en texte libre ; elle choisit un code. Drapeaux :
`argent` (jamais auto-exécutable, défense dans le code) et `executable`
(un exécuteur codé existe).

| Code | Argent | Executable | Description |
|---|---|---|---|
| `REPONDRE_AVIS` | non | oui | Réponse à un avis store, IA + QA + gabarit charté |
| `MAJ_KEYWORDS_ASO` | non | oui | Mise à jour keywords/description (par API metadata) |
| `PUSH_OTA_FIX` | non | oui | Correctif JS via EAS Update (jamais de feature par OTA) |
| `AJUSTER_NOTIF` | non | oui | Réglage cadence/contenu notifications (bornes codées) |
| `LANCER_TEST_PAYWALL` | **oui** | oui | Variante de paywall/prix → dossier chiffré, gate humain |
| `AJUSTER_PRIX` | **oui** | oui | Changement de prix IAP → dossier chiffré, gate humain |
| `ENGAGER_BUDGET_ADS` | **oui** | oui | Apple Search Ads / autre → dossier chiffré, gate humain |
| `KILL_SWITCH_VERSION` | non | oui | Force update d'une version cassée — alerte critique jointe |
| `PROPOSER_FEATURE` | non | non | Reste une proposition documentée (file build) |
| `PROPOSER_SUNSET` | **oui** | non | Dossier de kill d'app, décision humaine |

Seed prudent : rien en `auto` au départ sauf les rafraîchissements
idempotents déjà faits par cron. L'autonomie se **gagne** sur mesures J+7.

## 5 · Le châssis commun (ce qui rend une app « pas chère »)

Un template versionné dont chaque app est instanciée :
- **Expo (React Native + TypeScript)** — DÉCIDÉ sur veille 2026-08-10
  (codegen IA supérieur en TS, OTA conforme Apple 3.3.1(B), EAS
  multi-projets : 25 apps en Free / 100 en Production, `expo-updates`
  self-hostable ; réserve : Flutter + Shorebird — voir
  `ANALYSE_MARCHE.md`). EAS Build/Submit/Update, config par app
  (bundle id, icônes, tokens de design) générée.
- Deux **verrous manuels incompressibles** par app (~10 min, pas d'API
  officielle) : création de l'app dans App Store Connect et dans Play
  Console — le cockpit fournit la checklist et pré-remplit tout le
  reste (metadata, screenshots, IAP, soumission passent par API).
- **Kit offline** : cache MMKV/SQLite + file d'écritures + retry —
  chaque écran naît avec ses 3 états (normal / vide / sans réseau).
- **Kit monétisation** : RevenueCat + paywall configurable à distance.
- **Kit télémétrie** : Sentry + PostHog + événements standards
  (activation, rétention, paywall) identiques sur toutes les apps —
  c'est ce qui rend les KPIs comparables dans le cockpit.
- **Kit conformité** : écrans consentement, politique de confidentialité
  générée, déclarations data safety pré-remplies honnêtement.
- **Design tokens par app** : le châssis impose la structure, chaque app
  a sa charte (différenciation visuelle réelle — anti-4.3).
- Mises à jour du châssis **propagées** aux apps (PR automatique par app,
  CI qui rebuild — jamais d'édition à la main dans une app).

**Invariant anti-spam (guideline 4.3)** : le châssis mutualise la
plomberie, JAMAIS le produit. Une app n'entre en build que si l'étage 1
a nommé sa killer feature — le code de l'usine refuse de créer une app
sans dossier de viabilité `go`.

## 6 · Multi-app = multi-tenant dès le premier jour

Application directe du pattern (leçon la plus chère de l'ecom) :
- `app_id` sur TOUTE entité de l'usine, écrit à la création.
- **Toute sélection scopée** par `app_id` — une requête « le dernier
  build » sans filtre sert la mauvaise app dès la deuxième.
- Credentials par app en base (bundle ids, clés API stores, backend de
  l'app, comptes RevenueCat/PostHog) + résolveur unique
  `configPour(app_id)` avec repli global.
- Les données produit de chaque app vivent dans **son** backend, isolé
  de l'usine (choix du backend par app : décision D4 du cadrage —
  Supabase par app, Neon par app, ou app 100 % locale sans backend,
  l'option la moins chère et la plus robuste quand le concept le
  permet) ; l'usine ne stocke que le pilotage (KPIs agrégés, actions,
  mesures, docs).

## 7 · Le cockpit (dashboard d'administration)

Stack : **Next.js + Neon** (Postgres serverless — décision utilisateur du
2026-08-10), design niveau Linear/Stripe (PROMPT_05).
- La base Neon n'est accessible QUE côté serveur (server actions / route
  handlers) — jamais de requête directe du navigateur ; les leçons
  DelivUp s'adaptent : selects explicites, **vérification du RÔLE sur
  chaque route sensible**, et ce que l'ORM ne gère pas (triggers,
  contraintes) rejoué par script idempotent après chaque migration.
- Auth du cockpit : solution server-side éprouvée (Auth.js ou Better
  Auth) — à trancher dans l'audit détaillé.
- Neon apporte le branching de base (une branche par PR pour tester les
  migrations) — à intégrer à la CI du cockpit.

Pages :
- **Portfolio** : une carte par app — étage du pipeline, D1/D7/D30, MRR,
  crashs, note store, uptime des crons de l'app. Le « à traiter » en tête.
- **Fiche app** : pipeline vivant (la page `/pipeline` de la trame),
  docs générés (viabilité, cadrage, audit), builds/releases, file
  d'actions, mesures J+7, coûts (IA, builds, ads) — la fiche agrège tout.
- **File « À traiter » globale** : tous les gates humains triés par
  gravité (argent > release > QA > relectures) ; chaque item montre le
  dossier chiffré et le bouton qui applique — l'humain lit deux chiffres
  et clique.
- **Radar** : idées scorées, dossiers de viabilité, verdicts (y compris
  les kills — la mémoire des marchés écartés évite de re-analyser).
- **Config** : catalogue de modèles IA par tâche (changer = un clic),
  pouvoirs par code d'action (auto/proposition, réversible), templates
  de messages, seuils de kill/promotion.
- **Statut public** : page lecture seule, zéro donnée sensible, uptime
  PAR agent/cron — le trou de 16 jours devient visible en un regard.
- **Journal** : toutes les exécutions (exécutée/échec/ignorée + résumé),
  alertes, audit des gates.
- **Docs** : rubrique qui rend les documents du repo (`docs/` de l'usine
  et docs générés par app) — directive utilisateur : toute la
  documentation vit en local/dans le cockpit, jamais sur un service
  externe.

## 8 · Infrastructure & résilience (leçons terrain appliquées)

- **Répartition par risque** (décision utilisateur 2026-08-10) : le
  cockpit sur **Vercel** ; **l'usine (crons, agents, générations
  lourdes) sur le VPS EXISTANT** (identifiants fournis via `.env`,
  édité en append-only) — les tâches longues n'ont rien à faire sur du
  serverless (leçons 4-6). Respecter les quotas Vercel (leçon 2 :
  grouper les commits, pas de pushes « ping »). Déploiement VPS par
  rsync + docker compose ; build qui échoue = l'ancienne version
  continue.
- **Toutes les décisions se prennent depuis le cockpit** (directive
  utilisateur) : les décisions de cadrage (D1-D8…) comme les gates du
  run vivent dans une table `decisions`/file « À traiter » — jamais
  dans un fil de discussion. Le repo garde la trace markdown, le
  cockpit est l'interface d'action.
- **Crons** : verrou anti-chevauchement atomique (insert-si-absent),
  `running` > 2× durée normale = crash → error + verrou auto-libéré ;
  purge des succès, conservation des erreurs ; heartbeats.
- **Le surveillant ne partage jamais le chemin mort des surveillés** :
  contrôle de cohérence sur les DONNÉES réelles (les crons ont-ils
  écrit ?), silencieux > 2× cadence = PANNE critique + e-mail, statut
  public consultable du téléphone.
- **IA** : catalogue modèle-par-tâche en base, repli inter-fournisseurs
  (jamais re-essayer le compte à sec), prompts assemblés par code depuis
  des matrices en base, réponses JSON parsées défensivement.
- **Webhooks entrants** (RevenueCat, stores, CI) : signés, vérifiés
  fail-closed, dédupliqués (les webhooks rejouent).
- Les apps/le cockpit n'appellent jamais le moteur de workflows
  directement : elles écrivent un ÉTAT en base, un webhook déclenche.

## 9 · Schéma de données de l'usine (V1)

```
apps(id, name, status, bundle_ids, config, created_at)
app_events(app_id, from_status, to_status, actor, at)
ideas(id, source, theme, score_components, score, status)
complaints(idea_id, store_app, stars, excerpt, theme, url, seen_at)
viability_reports(idea_id, rounds, critics, probability, verdict, dossier)
action_types(code, libelle, pour_ia, argent, executable)
actions(id, app_id, code, params, mode proposé/auto, status, dossier)
executions(action_id, result, summary, at)
snapshots(app_id, kpis, taken_at)                -- référence avant action
measures(action_id, verdict, kpis_delta, at)      -- J+7
powers(code, app_id?, auto bool, granted_by, at)  -- revalidés à l'exécution
qa_reviews(subject, scope, verdict, score, issues, model, at)
model_catalog(task, provider, model, fallback, cost_estimate)
costs(app_id, kind ia/build/ads/store, amount, at)
cron_heartbeats(job, app_id?, status, started_at, finished_at)
alerts(severity, source, message, status, at)
```

## 10 · Ce qui reste HUMAIN et pourquoi (carte d'automatisation)

| Tâche | Niveau | Pourquoi |
|---|---|---|
| Scoring d'idées, seuils, verdicts | 1 · Code | Auditable, reproductible |
| Pipeline release, crons, relances | 2 · Workflow | Retries + journal |
| Rédaction (docs, fiches, réponses avis) | 3 · IA + QA | Sortie contrainte, toujours QA |
| Build des apps, recherche marché | 4 · Agent | Interne uniquement, jamais client-facing en prod |
| Création compte dev Apple/Google | Manuel | Identité/DUNS/vérifications — non automatisable |
| Validation viabilité, soumission store, tout l'argent | Humain gate | Risque compte + argent = jamais auto |
| Test sur appareil réel | Humain hebdo | Le simulateur ment — invariant trame |

---

**Voir aussi** : `CADRAGE_USINE.md` (vision, business, décisions à
valider) et `ANALYSE_MARCHE.md` (données sourcées à date).
