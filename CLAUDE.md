# Usine à apps mobiles — guide pour Claude Code

Usine qui produit et exploite un portfolio d'apps mobiles : radar
d'opportunités → gate de viabilité adversarial → build agentique sur
châssis Expo → stores → run mesuré. Cockpit Next.js + Neon sur Vercel ;
crons/agents sur le VPS. Voir `docs/planning/` (cadrage, architecture,
analyse de marché sourcée).

**Principe directeur : l'IA argumente, le CODE tranche, l'HUMAIN valide
l'argent.**

## Structure

- `cockpit/` — dashboard Next.js 15 + Drizzle + Neon, déployé sur Vercel
  (projet `usine-cockpit`, CLI ; root directory `cockpit`).
- `radar/` — étage 0, cron VPS quotidien 05:30 UTC (docker node:22-alpine).
- `gate/` — étage 1, cron VPS horaire :15. DeepSeek argumente, le code
  calcule le verdict go/pivot/kill.
- `TRAME_PROJET_MOBILE/` — méthode (auto-ignorée de git, ne jamais commiter).
- **Les apps du portfolio vivent dans `/Users/mehdi/code/usine-apps/<nom>/`**
  (un repo par app, D3) — première entrée : `promptlandia` (ex-NeoMind, app existante de
  l'utilisateur, idée `MANUELLE:neomind` au gate avec codeSpark Academy
  comme référence de minage).
- VPS : `ssh -i ~/.ssh/usine_vps ubuntu@145.239.79.21` (déploiement par
  rsync ; jamais d'édition directe sur la machine).

## Règles non négociables

1. **Commits signés `gloomingagency@gmail.com`** — un autre auteur fait
   BLOQUER le déploiement Vercel (incident vécu : deploy BLOCKED).
2. **`cockpit/.env` s'édite en APPEND-ONLY** ; la DERNIÈRE occurrence
   d'une variable fait foi. Le `DATABASE_URL` Supabase qui y traîne est
   celui du projet ECOM — ne JAMAIS l'utiliser ici (cockpit = Neon,
   projet `usine-cockpit`).
3. **Migration appliquée AVANT de déployer le code qui s'en sert**
   (`npx drizzle-kit migrate` avec le DATABASE_URL de fin de .env).
4. **Base accédée uniquement côté serveur** ; toute route sensible passe
   par le middleware Basic Auth. Exceptions listées dans le matcher
   (`/statut` public lecture seule, `/api/veille` par CRON_SECRET,
   `/api/idee-action` par signature HMAC + expiration).
5. **Aucune app ne se construit sans verdict `go` du gate** + validation
   humaine (Apple 4.3 durci 2026-06 : un flot d'apps similaires met le
   COMPTE en danger). Un kill est un succès.
6. **Tout cron : verrou atomique en base + heartbeat** (`cron_heartbeats`,
   `expected_every_sec`) ; running > 2× cadence = crash auto-libéré. La
   veille (`/api/veille`, cron Vercel 07:00 UTC) tourne HORS du VPS —
   le surveillant ne partage jamais le chemin mort des surveillés.
7. **Sorties LLM : JSON contraint, parsé défensivement, consigne de
   compacité + retry** — incident vécu : réponse tronquée par max_tokens
   → JSON invalide (gate, 2026-08-11). Vérifier `finish_reason`.
8. **Les scores/verdicts sont calculés PAR CODE** (seuils explicites,
   décote données maigres) — jamais laissés à l'appréciation du modèle.
9. **Un push n'est jamais une mise en ligne** : vérifier l'état READY du
   déploiement, puis tester les routes en prod (401 sans auth, 200 avec).
10. **Grouper les commits** (quotas Vercel : les déploiements CLI partent
    à chaque `deploy`, pas à chaque push tant que l'app GitHub Vercel
    n'est pas installée).

## Décisions actées (détail : cockpit /decisions et docs/planning/)

Portfolio propre (D1) · Google d'abord, compte organisation D-U-N-S,
Android first, Apple ensuite (D2) · monorepo + repo par app (D3) ·
apps local-first sinon Neon par app (D4) · cockpit Next+Neon (D4bis) ·
apps React Native + Expo (D4ter) · n8n glue + crons scripts, Inngest si
besoin (D5) · budget 1ère app ≤ 50-100 $ hors comptes (D7) · les deux
appareils de test disponibles (D8).

## Ce qui reste à faire (ne pas supposer que c'est fait)

- D6 (périmètre définitif du radar) : en attente de plus de données —
  le spectre reste LARGE (jeux, éducation, formations inclus).
- Compte Google Play organisation : à créer par l'utilisateur
  (prochainement) ; Apple ensuite.
- Installer l'app GitHub Vercel (deploy auto sur push) — pour l'instant
  déploiement par CLI.
- Étages 2+ : cadrage généré, châssis Expo + create-app, build
  agentique, release, run (taxonomie d'actions, mesures J+7).
- Purge périodique des heartbeats anciens (garder les erreurs).
