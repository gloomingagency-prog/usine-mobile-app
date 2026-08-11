import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { relancerAnalyse, trierIdee } from "../../idees/actions";

export const dynamic = "force-dynamic";

type Feature = {
  feature: string;
  type: "killer" | "differenciante" | "support";
  douleur: string;
  pourquoi_absent_chez_eux?: string;
  effort?: string;
  argument_vente?: string;
};

type Scenario = {
  scenario: string;
  installs_mois: number;
  conversion_pct: number;
  abonnes_mois: number;
  mrr_net_usd: number;
  profit_mois_usd: number;
};

type Archetype = { archetype?: string; potentiel_percee_0_100?: number; raison?: string };

type BusinessPlan = {
  modele?: string;
  paywall?: string;
  prix_mensuel_usd?: number;
  prix_annuel_usd?: number;
  prix_reference_concurrents_usd?: number | null;
  sous_cote_pct?: number | null;
  sources_revenus?: string[];
  justification?: string;
  commission_stores?: string;
  couts_fixes_mois_usd?: number;
  scenarios?: Scenario[];
  seuil_rentabilite_installs_mois?: number;
  objectifs?: { d1_pct: number; d7_pct: number; d30_pct: number; note?: string };
  methode?: string;
};

type Dossier = {
  donnees?: { nb_plaintes_analysees?: number; manuelle?: boolean; similaires?: { titre: string; note: number; avis: number; installs: number }[] };
  themes?: { theme: string; frequence: number; citations: string[] }[];
  proposition_finale?: Record<string, unknown>;
  features_differenciantes?: Feature[];
  archetype?: Archetype;
  business_plan?: BusinessPlan;
  sherlocking?: string[];
  critiques?: { dimension: string; score: number; kill: boolean; raison: string; risques?: string[] }[];
  kills?: string[];
  methode?: string;
};

const TYPE_FEATURE: Record<string, { label: string; cls: string }> = {
  killer: { label: "KILLER", cls: "validee" },
  differenciante: { label: "différenciante", cls: "a_valider" },
  support: { label: "support", cls: "decidee" },
};

const VERDICT_STYLE: Record<string, { label: string; cls: string }> = {
  go: { label: "GO — wedge viable", cls: "ok" },
  pivot: { label: "À PIVOTER — angle à revoir", cls: "warn" },
  kill: { label: "KILL — ne pas construire", cls: "danger" },
};

export default async function ViabilitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ideaId = decodeURIComponent(id);
  const db = getDb();
  if (!db) notFound();
  const rows = await db
    .select()
    .from(schema.viabilityReports)
    .innerJoin(schema.ideas, eq(schema.ideas.id, schema.viabilityReports.ideaId))
    .where(eq(schema.viabilityReports.ideaId, ideaId))
    .limit(1);
  if (rows.length === 0) notFound();
  const report = rows[0].viability_reports;
  const idea = rows[0].ideas;
  const d = report.dossier as Dossier;
  const v = VERDICT_STYLE[report.verdict];
  const prop = d.proposition_finale ?? {};

  return (
    <>
      <p className="meta">
        <Link href="/idees">← File d&apos;idées</Link>
      </p>
      <p className="eyebrow">Dossier de viabilité · {report.model}</p>
      <h1>{idea.titre}</h1>

      <div className={`card verdict`}>
        <span className={`v ${v.cls}`}>{v.label}</span>
        <p>
          {d.archetype?.archetype && (
            <>
              <span className="badge decidee">pari : {d.archetype.archetype}</span>{" "}
              <span className="badge a_valider">
                potentiel de percée : {d.archetype.potentiel_percee_0_100 ?? "?"}/100
              </span>
              <br />
            </>
          )}
          Probabilité de succès calculée par code : <b>{report.probability} %</b>
          {d.donnees?.nb_plaintes_analysees !== undefined &&
            ` · ${d.donnees.nb_plaintes_analysees} plaintes réelles analysées`}
          {(d.kills ?? []).length > 0 && (
            <>
              <br />
              <span className="danger">Motifs de kill : {(d.kills ?? []).join(" · ")}</span>
            </>
          )}
        </p>
        <p className="src">{d.methode}</p>
      </div>

      {idea.status === "a_analyser" && (
        <div className="card decision">
          <div className="head">
            <b>Gate humain — le verdict machine ne construit rien tout seul</b>
          </div>
          <form action={trierIdee}>
            <input type="hidden" name="id" value={idea.id} />
            <button className="primary" name="statut" value="retenue" type="submit">
              Retenir → cadrage (étage 2)
            </button>
            <button className="subtle" name="statut" value="ecartee" type="submit">
              Écarter
            </button>
          </form>
          <form action={relancerAnalyse}>
            <input type="hidden" name="id" value={idea.id} />
            <button type="submit">Relancer l&apos;analyse (nouveau dossier dans l&apos;heure)</button>
          </form>
        </div>
      )}

      {(d.features_differenciantes ?? []).length > 0 && (
        <>
          <h2>Proposition de valeur — ce que NOUS apportons</h2>
          <p className="meta">
            Chaque feature est ancrée dans une douleur réelle des plaintes. C&apos;est la
            valeur administrable du dossier — et la matière commerciale si on la vend.
          </p>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Douleur adressée</th>
                  <th>Pourquoi eux ne l&apos;ont pas</th>
                  <th>Effort</th>
                  <th>Argument de vente</th>
                </tr>
              </thead>
              <tbody>
                {(d.features_differenciantes ?? []).map((f, i) => (
                  <tr key={i}>
                    <td>
                      <b>{f.feature}</b>
                      <br />
                      <span className={`badge ${TYPE_FEATURE[f.type]?.cls ?? "decidee"}`}>
                        {TYPE_FEATURE[f.type]?.label ?? f.type}
                      </span>
                    </td>
                    <td>{f.douleur}</td>
                    <td>{f.pourquoi_absent_chez_eux ?? "—"}</td>
                    <td>{f.effort ?? "—"}</td>
                    <td>{f.argument_vente ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {d.business_plan && (
        <>
          <h2>Business plan — d&apos;où vient l&apos;argent, combien ça peut rapporter</h2>
          <div className="cols">
            <div className="card">
              <h3>Modèle</h3>
              <p>
                <b>{d.business_plan.modele ?? "—"}</b> · paywall {d.business_plan.paywall}
              </p>
              <p className="src">{d.business_plan.justification}</p>
            </div>
            <div className="card">
              <h3>Prix d&apos;attaque (doctrine : mieux pour moins cher)</h3>
              <p className="big">
                {d.business_plan.prix_mensuel_usd} $/mois
              </p>
              <p className="src">
                ou {d.business_plan.prix_annuel_usd} $/an
                {d.business_plan.prix_reference_concurrents_usd
                  ? ` · référence concurrents ${d.business_plan.prix_reference_concurrents_usd} $ (sous-cote ${d.business_plan.sous_cote_pct} %)`
                  : ""}{" "}
                · commission {d.business_plan.commission_stores}
              </p>
            </div>
            <div className="card">
              <h3>Seuil de rentabilité</h3>
              <p className="big">
                ~{d.business_plan.seuil_rentabilite_installs_mois?.toLocaleString("fr-FR")}{" "}
                installs/mois
              </p>
              <p className="src">
                pour couvrir ~{d.business_plan.couts_fixes_mois_usd} $/mois de coûts fixes
                (scénario médian)
              </p>
            </div>
            <div className="card">
              <h3>Objectifs (mesurés dès la V1)</h3>
              <p>
                D1 &gt; {d.business_plan.objectifs?.d1_pct} % · D7 &gt;{" "}
                {d.business_plan.objectifs?.d7_pct} % · D30 &gt;{" "}
                {d.business_plan.objectifs?.d30_pct} %
              </p>
              <p className="src">{d.business_plan.objectifs?.note}</p>
            </div>
          </div>
          {(d.business_plan.sources_revenus ?? []).length > 0 && (
            <p>
              <b>Sources de revenus :</b> {(d.business_plan.sources_revenus ?? []).join(" · ")}
            </p>
          )}
          <h3>Projections selon le volume d&apos;utilisateurs</h3>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Scénario</th>
                  <th>Installs/mois</th>
                  <th>Conversion</th>
                  <th>Abonnés/mois</th>
                  <th>MRR net</th>
                  <th>Profit/mois</th>
                </tr>
              </thead>
              <tbody>
                {(d.business_plan.scenarios ?? []).map((s) => (
                  <tr key={s.scenario}>
                    <td>
                      <b>{s.scenario}</b>
                    </td>
                    <td>{s.installs_mois.toLocaleString("fr-FR")}</td>
                    <td>{s.conversion_pct} %</td>
                    <td>{s.abonnes_mois.toLocaleString("fr-FR")}</td>
                    <td className="ok">{s.mrr_net_usd.toLocaleString("fr-FR")} $</td>
                    <td className={s.profit_mois_usd >= 0 ? "ok" : "danger"}>
                      {s.profit_mois_usd.toLocaleString("fr-FR")} $
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="src">{d.business_plan.methode}</p>
        </>
      )}

      <h2>La proposition finale (après 3 tours adversariaux)</h2>
      <div className="cols">
        <div className="card">
          <h3>Douleur ciblée</h3>
          <p>{String(prop.douleur ?? "—")}</p>
        </div>
        <div className="card">
          <h3>Killer feature</h3>
          <p>{String(prop.killer_feature ?? "—")}</p>
        </div>
        <div className="card">
          <h3>Canal des 100 premiers</h3>
          <p>{String(prop.canal_100 ?? "—")}</p>
        </div>
        <div className="card">
          <h3>Cible</h3>
          <p>{String(prop.cible ?? "—")}</p>
        </div>
      </div>
      {Array.isArray(prop.acceptance) && (
        <>
          <h3>Critères d&apos;acceptance</h3>
          <ul>{(prop.acceptance as string[]).map((a, i) => <li key={i}>{a}</li>)}</ul>
        </>
      )}

      <h2>Les 4 critiques indépendants</h2>
      <div className="cols">
        {(d.critiques ?? []).map((c) => {
          const cls = c.score >= 55 ? "ok" : c.score >= 40 ? "warn" : "danger";
          return (
            <div className="card" key={c.dimension}>
              <h3>
                {c.dimension}
                {c.kill && <span className="danger"> · KILL</span>}
              </h3>
              <div className="meter" role="img" aria-label={`score ${c.score} sur 100`}>
                <div className={`fill ${cls}-bg`} style={{ width: `${c.score}%` }} />
              </div>
              <p className={`big ${cls}`}>{c.score}</p>
              <p className="src">{c.raison}</p>
            </div>
          );
        })}
      </div>

      {(d.sherlocking ?? []).length > 0 && (
        <>
          <h2>⚠ Sherlocking détecté (par code)</h2>
          <ul>{(d.sherlocking ?? []).map((s, i) => <li key={i} className="warn">{s}</li>)}</ul>
        </>
      )}

      <h2>Thèmes de plaintes réelles</h2>
      {(d.themes ?? []).map((t, i) => (
        <div className="card decision" key={i}>
          <div className="head">
            <b>{t.theme}</b>
            <span className="id">fréquence : {t.frequence}</span>
          </div>
          {(t.citations ?? []).map((c, j) => (
            <p className="detail" key={j}>« {c} »</p>
          ))}
        </div>
      ))}

      {(d.donnees?.similaires ?? []).length > 0 && (
        <>
          <h2>Teardown — concurrents similaires</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr><th>App</th><th>Note</th><th>Avis</th><th>Installs</th></tr>
              </thead>
              <tbody>
                {(d.donnees?.similaires ?? []).map((s, i) => (
                  <tr key={i}>
                    <td>{s.titre}</td>
                    <td className={s.note < 4.3 ? "warn" : "ok"}>{s.note}</td>
                    <td>{s.avis?.toLocaleString("fr-FR")}</td>
                    <td>{s.installs?.toLocaleString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
