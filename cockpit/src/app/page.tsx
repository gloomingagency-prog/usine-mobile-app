import Link from "next/link";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

async function totalCosts(): Promise<number | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select({ c: schema.costs.amountCents }).from(schema.costs);
  return rows.reduce((s, r) => s + r.c, 0);
}

export default async function SynthesePage() {
  const total = await totalCosts();
  return (
    <>
      <p className="eyebrow">Cadrage · 10 août 2026</p>
      <h1>Usine à apps mobiles</h1>
      <p className="meta">
        Synthèse du cadrage, de l&apos;analyse de marché et de l&apos;architecture. Documents
        complets dans la rubrique <Link href="/docs">Docs</Link> — les décisions se
        prennent dans <Link href="/decisions">Décisions</Link>.
      </p>

      <div className="card verdict">
        <span className="v">Verdict : VIABLE SOUS CONDITIONS</span>
        <p>
          Le portefeuille d&apos;apps est la réponse rationnelle à un marché en loi de
          puissance (~81 % des apps à abonnement ne dépassent jamais 1 000 $/mois ; le
          top 5 % gagne ~400× le bottom 25 %). Trois conditions non négociables,
          encodées dans l&apos;usine :
        </p>
        <ol>
          <li>
            <b>Jamais d&apos;app sans wedge prouvé</b> — Apple a durci la guideline 4.3 le
            9 juin 2026 : retrait rétroactif des apps sans traction, exclusion du
            Developer Program pour soumissions répétées d&apos;apps « low-effort ». Le code
            refuse de créer une app sans verdict <code>go</code>.
          </li>
          <li>
            <b>Canal de distribution avant le build</b> — l&apos;UA payante ne ferme pas
            pour l&apos;app médiane (CPI 2-6 $ contre 0,31 $ de revenu médian par install à
            J+60).
          </li>
          <li>
            <b>Cadence maîtrisée</b> — max 2 apps en build, kill obligatoire des apps
            sans traction, un seul compte par store (Google organisation d&apos;abord,
            Apple ensuite — décision D2).
          </li>
        </ol>
      </div>

      <p className="principle">L&apos;IA argumente, le CODE tranche, l&apos;HUMAIN valide l&apos;argent.</p>

      <h2>Le renversement stratégique</h2>
      <p>
        La vague « vibe coding » (+60 % de soumissions au T1 2026) a fait tendre le coût
        de production vers zéro <em>pour tout le monde</em>. Le code n&apos;est plus un
        avantage compétitif. Le nôtre : un <b>gate de viabilité adversarial</b> (plaintes
        réelles minées, check sherlocking, canal identifié, killer feature nommée) et une{" "}
        <b>boucle d&apos;exploitation mesurée</b> (diagnostic → action typée → mesure J+7 →
        autonomie gagnée sur preuves), héritée de l&apos;usine ecom.
      </p>

      <h2>Le pipeline en 7 étages</h2>
      <div className="pipeline">
        <div className="stage">
          <b>Radar</b>
          <span>minage d&apos;avis 1-3★, keywords, scoring par code</span>
        </div>
        <div className="stage">
          <b>Gate de viabilité</b>
          <span>analyse adversariale ≥3 tours, verdict go/pivot/kill calculé</span>
          <span className="gate">GATE HUMAIN</span>
        </div>
        <div className="stage">
          <b>Cadrage généré</b>
          <span>CADRAGE, AUDIT, CLAUDE.md pré-instruits par agents</span>
          <span className="gate">RELECTURE</span>
        </div>
        <div className="stage">
          <b>Build agentique</b>
          <span>châssis commun + Claude Code headless, maillon par maillon</span>
          <span className="gate">APPAREIL RÉEL / HEBDO</span>
        </div>
        <div className="stage">
          <b>Release stores</b>
          <span>fiches + QA anti-invention, soumission par API</span>
          <span className="gate">GATE HUMAIN</span>
        </div>
        <div className="stage">
          <b>Run autonome</b>
          <span>télémétrie, taxonomie fermée d&apos;actions, mesure J+7</span>
          <span className="gate">ARGENT = GATE</span>
        </div>
        <div className="stage">
          <b>Portfolio</b>
          <span>seuils kill/scale chiffrés, réallocation budget</span>
          <span className="gate">GATE HUMAIN</span>
        </div>
      </div>

      <h2>Ce que dit le marché (sources du 10/08/2026)</h2>
      <div className="cols">
        <div className="card">
          <h3>Loi de puissance</h3>
          <p>
            ~81 % des apps à abonnement &lt; 1 000 $/mois à 2 ans ; dans les portfolios
            qui réussissent, 1 app fait 70-99 % du revenu (cas Röhl : 602 k$/2025,
            HabitKit ≈ 99 %).
          </p>
          <p className="src">RevenueCat State of Subscription Apps 2026 (115 000+ apps).</p>
        </div>
        <div className="card">
          <h3>Monétisation à encoder</h3>
          <p>
            Paywall dur à l&apos;onboarding : ~5× la conversion du freemium (10,7-12 % vs
            2,1 %). Renouvellement annuel 83,4 %/période ; l&apos;hebdo pèse 55,5 % du
            revenu. Point de prix : 9,99 $.
          </p>
          <p className="src">RevenueCat 2026 ; Adapty/Airbridge 2026.</p>
        </div>
        <div className="card">
          <h3>Cibles de rétention</h3>
          <p>
            Médianes 2026 : D1 ~25 %, D7 ~12 %, D30 ~5-7 %. Top quartile : D1 &gt; 30 %,
            D7 &gt; 15 %, D30 &gt; 8 % — les cibles par défaut du portfolio.
          </p>
          <p className="src">Adjust, agrégats 2026.</p>
        </div>
        <div className="card">
          <h3>Niches</h3>
          <p>
            <span className="danger">Saturé :</span> photo/avatar IA, hypercasual pur.{" "}
            <span className="ok">Ouvert :</span> verticalisation fine, publics
            sous-servis, santé/habitudes. <span className="warn">Risque :</span>{" "}
            utilitaires mono-fonction proches de l&apos;OS (sherlocking).
          </p>
        </div>
      </div>

      <h2>Stack décidée</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Bloc</th>
              <th>Choix</th>
              <th>Justification courte</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>Cockpit</b>
              </td>
              <td>Next.js + Neon, déployé sur Vercel</td>
              <td>Base accédée côté serveur uniquement ; l&apos;usine (crons, agents) sur le VPS existant.</td>
            </tr>
            <tr>
              <td>
                <b>Apps</b>
              </td>
              <td>React Native + Expo</td>
              <td>
                Codegen IA supérieur en TS ; OTA conforme (Apple 3.3.1(B)) ; EAS
                multi-projets ; réserve : Flutter + Shorebird.
              </td>
            </tr>
            <tr>
              <td>
                <b>Backend des apps</b>
              </td>
              <td>Local-first ; sinon Neon par app</td>
              <td>Coût marginal ≈ 0 (modèle HabitKit) ; Neon Free = 100 projets.</td>
            </tr>
            <tr>
              <td>
                <b>Monétisation / télémétrie</b>
              </td>
              <td>RevenueCat + PostHog + Sentry</td>
              <td>Gratuits à notre échelle ; RevenueCat 1 % au-delà de 2 500 $ MTR.</td>
            </tr>
            <tr>
              <td>
                <b>Orchestration</b>
              </td>
              <td>n8n d&apos;abord (VPS), Inngest si besoin</td>
              <td>Commencer au niveau le plus bas qui marche.</td>
            </tr>
            <tr>
              <td>
                <b>Agents</b>
              </td>
              <td>Claude Code headless + GitHub Actions</td>
              <td>Sessions CI reproductibles, coût par session tracé (~13 $/jour actif).</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <b>Budget</b> : première app ≤ 50-100 $ (décision D7) — tenable : ~15-50 $ de
        variable (surtout tokens IA) + 25 $ le compte Google. Le marketing est gated par
        construction (dossier chiffré → validation humaine).
        {total !== null && (
          <>
            {" "}
            <Link href="/couts">
              <b>Dépensé à date : {(total / 100).toFixed(2)} $.</b>
            </Link>
          </>
        )}
      </p>

      <h2>Prochaines étapes (V1 de l&apos;usine)</h2>
      <ol>
        <li>
          <b>Cockpit squelette</b> — cette app : machine à états, décisions, docs, puis
          file « À traiter », heartbeats et statut public.
        </li>
        <li>
          <b>Radar v1</b> — crons de minage d&apos;avis (VPS) + scoring par code + file d&apos;idées.
        </li>
        <li>
          <b>Gate de viabilité</b> — agents adversariaux + verdict calculé + dossier lisible.
        </li>
        <li>
          <b>Châssis v1 + create-app</b> — squelette Expo instanciable (Sentry, RevenueCat,
          PostHog, kit offline, CI EAS).
        </li>
        <li>
          <b>Build agentique + release + run v1</b> — en produisant la <b>première app
          pilote</b> (Android d&apos;abord), qui valide chaque étage en réel.
        </li>
      </ol>
      <p>
        Règle de construction : l&apos;usine se construit <em>en produisant sa première
        app</em> — jamais trois mois d&apos;infrastructure sans app.
      </p>
    </>
  );
}
