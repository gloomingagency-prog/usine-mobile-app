import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { trierIdee } from "../../idees/actions";

export const dynamic = "force-dynamic";

type Dossier = {
  donnees?: { nb_plaintes_analysees?: number; manuelle?: boolean; similaires?: { titre: string; note: number; avis: number; installs: number }[] };
  themes?: { theme: string; frequence: number; citations: string[] }[];
  proposition_finale?: Record<string, unknown>;
  sherlocking?: string[];
  critiques?: { dimension: string; score: number; kill: boolean; raison: string; risques?: string[] }[];
  kills?: string[];
  methode?: string;
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
        </div>
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
      <div className="tablewrap">
        <table>
          <thead>
            <tr><th>Dimension</th><th>Score</th><th>Raison</th></tr>
          </thead>
          <tbody>
            {(d.critiques ?? []).map((c) => (
              <tr key={c.dimension}>
                <td><b>{c.dimension}</b>{c.kill && <span className="danger"> · KILL</span>}</td>
                <td className={c.score >= 55 ? "ok" : c.score >= 40 ? "warn" : "danger"}>{c.score}</td>
                <td>{c.raison}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
