# Doctrine du portefeuille — mindset, prix, archétypes

> Directive utilisateur du 2026-08-11, passée au crible de l'analyse de
> marché (`ANALYSE_MARCHE.md`) et des données réelles du gate. Cette
> doctrine est ENCODÉE dans le gate (prompts + calculs) — pas un vœu.

## 1 · La fonction objectif : faire PERCER une app, pas maximiser le MRR

L'argent n'est pas le moteur ; l'objectif est qu'au moins une app du
portefeuille perce. Conséquences opérationnelles (analyse) :

- La loi de puissance du marché (top 5 % ≈ 400× le bottom 25 %) rend
  cette stratégie **rationnelle** : on multiplie les tickets à espérance
  positive et coût marginal ≈ 0, on tue vite, on double sur ce qui prend.
- Le gate doit donc pondérer le **potentiel de percée** (taille de
  l'audience, boucle virale/communauté, profondeur de la douleur) et pas
  seulement la rentabilité immédiate — d'où le champ `potentiel_percee`
  ajouté aux dossiers.
- Garde-fou invariant : « pas le moteur » ne veut pas dire « pas de
  modèle ». Chaque app garde un business plan chiffré et un seuil de
  rentabilité — une app qui perce sans modèle brûle sa percée (leçon des
  benchmarks : monétiser se prépare avant la traction, s'active après).

## 2 · Doctrine prix : MIEUX pour MOINS CHER

Intuition utilisateur : nos coûts de maintenance ≈ 0 → sous-coter les
incumbents tout en livrant plus. **Analyse : c'est notre meilleur angle
par défaut, avec trois garde-fous.**

Pourquoi ça marche ici :
- C'est une **disruption par structure de coûts** classique : les
  incumbents portent équipes/serveurs/support ; l'usine non. Eux ne
  peuvent PAS suivre notre prix sans casser leur P&L.
- Les données réelles le confirment : la plainte n°1 minée par le gate
  (cas Avatar Maker : paywalls haïs, limites de temps, achats forcés)
  désigne la monétisation agressive des incumbents comme LE wedge le
  plus fréquent. « Mieux pour moins cher » est littéralement ce que les
  avis 1-3★ réclament.
- Objectif percée : un prix bas maximise volume, téléchargements et
  avis — et **le moat sur un store, ce sont les avis**. On achète du
  moat avec de la marge sacrifiée : cohérent avec §1.

Les trois garde-fous (contre-arguments intégrés) :
1. **Le prix bas ne crée pas la distribution.** Une app moins chère que
   personne ne trouve reste morte — et moins de revenu par utilisateur =
   moins de budget d'acquisition possible. Cette doctrine VERROUILLE
   notre dépendance à l'organique (ASO + canal communautaire), déjà
   exigée au gate. Assumé.
2. **Le « mieux » est le moat, le « moins cher » est l'accélérateur.**
   Si le prix est le seul différenciateur, il se copie en un clic. Le
   gate refuse toujours un dossier sans features différenciantes — le
   prix ne remplace jamais le wedge, il précipite le switch.
3. **Moins cher ≠ gratuit-total.** Les benchmarks sont têtus : un
   paywall dur à petit prix convertit ~5× mieux qu'un freemium flou.
   Doctrine : prix d'attaque ~30-50 % sous la référence concurrente,
   monétisation honnête (le gratuit livre un vrai basique), et
   **échelle de prix** : une fois le moat d'avis construit, le prix peut
   remonter pour les nouveaux — les early users gardent le leur.

## 3 · Archétypes de paris (le « curated large » sur les populations)

Le portefeuille vise toutes sortes de populations, y compris des paris
étranges. Trois archétypes, avec des critères de jugement DIFFÉRENTS —
une loterie ne se juge pas sur le D30 :

| Archétype | Nature | Exemple utilisateur | Se juge sur |
|---|---|---|---|
| **compounding** | Rétention, communauté, revenu moyen-long terme | App éducative, jeu à progression | D7/D30, communauté, LTV |
| **cash** | Utilitaire à conversion rapide | Outil qui résout une douleur précise | Conversion paywall, seuil de rentabilité |
| **loterie** | Novelty/viral à variance énorme | « Jeu à 1 000 € pour riches » | Potentiel viral, coût ≈ 0, risque store |

Analyse honnête de l'archétype loterie (l'exemple « app à 1 000 € ») :
- Le précédent « I Am Rich » (999,99 $, 2008) a été **retiré par Apple
  en 24 h**. La guideline 4.2 (minimum functionality) et le durcissement
  4.3(b) de juin 2026 (purge rétroactive des apps sans traction) rendent
  ce pari **risqué pour le COMPTE**, pas seulement pour l'app.
- Doctrine : les loteries passent par le MÊME gate (qui détectera le
  risque store), restent minoritaires, et **jamais parmi les premières
  apps du compte** — les premières publications construisent la
  réputation du compte développeur ; on ne l'hypothèque pas sur un
  gimmick. Une loterie « propre » (fonctionnalité réelle + humour/segment
  assumé) passe ; un gimmick vide ne passera pas la review de 2026.

**Composition proposée du portefeuille (décision D9, à valider au
cockpit)** : ~70 % compounding · ~20 % cash · ~10 % loterie, révisable
sur données. Les premières apps : compounding ou cash uniquement.

## 4 · Ce que ça change concrètement dans l'usine (encodé)

- Le gate classe chaque dossier par **archétype** + `potentiel_percee`
  (0-100, justifié) — visible sur la page dossier.
- Le business plan applique la **doctrine prix** : prix d'attaque
  sous-coté vs référence concurrente affichée (avec le % de sous-cote),
  monétisation honnête, projections toujours calculées par code.
- Les critiques jugent selon l'archétype (une loterie n'est pas tuée
  pour son D30 ; elle l'est pour son risque store ou l'absence de
  boucle virale).
- Le verdict de percée reste soumis aux mêmes gates humains — et la
  composition du portefeuille (D9) borne la part de chaque archétype.
