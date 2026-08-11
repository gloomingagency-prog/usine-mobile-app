import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { ajouterIdee, trierIdee } from "./actions";

export const dynamic = "force-dynamic";

type Metrics = {
  installs?: number;
  note?: number;
  avis?: number;
  genre?: string;
  pays?: string;
  manuelle?: boolean;
  plaintes?: { note: number; extrait: string }[];
};

type Idea = typeof schema.ideas.$inferSelect;
type Report = typeof schema.viabilityReports.$inferSelect;
type Row = { idea: Idea; report: Report | null };

const STATUT_LABEL: Record<string, string> = {
  nouvelle: "Nouvelle",
  a_analyser: "À analyser",
  ecartee: "Écartée",
  retenue: "Retenue",
};
const BADGE_CLASS: Record<string, string> = {
  nouvelle: "a_valider",
  a_analyser: "a_valider",
  ecartee: "refusee",
  retenue: "validee",
};

function IdeaCard({ idea, report }: Row) {
  const m = idea.metrics as Metrics;
  const dossier = report?.dossier as { archetype?: { archetype?: string; potentiel_percee_0_100?: number } } | undefined;
  const archetype = dossier?.archetype;
  return (
    <div className="card decision">
      <div className="head">
        <span className="badge decidee">{m.manuelle ? "manuelle" : idea.score}</span>
        {m.manuelle ? (
          <b>{idea.titre}</b>
        ) : (
          <b>
            <a
              href={`https://play.google.com/store/apps/details?id=${idea.appRef}`}
              target="_blank"
              rel="noreferrer"
            >
              {idea.titre}
            </a>
          </b>
        )}
        <span className="id">{idea.categorie}</span>
        <span className={`badge ${BADGE_CLASS[idea.status]}`}>{STATUT_LABEL[idea.status]}</span>
        {report && (
          <Link href={`/viabilite/${encodeURIComponent(idea.id)}`}>
            <span
              className={`badge ${
                report.verdict === "go" ? "validee" : report.verdict === "kill" ? "refusee" : "a_valider"
              }`}
            >
              dossier : {report.verdict.toUpperCase()} {report.probability}%
            </span>
          </Link>
        )}
        {archetype?.archetype && (
          <span className="id">
            {archetype.archetype} · percée {archetype.potentiel_percee_0_100 ?? "?"}/100
          </span>
        )}
        {!report && idea.status === "a_analyser" && (
          <span className="id">analyse en attente (cron horaire)</span>
        )}
      </div>
      <p className="detail">
        {idea.resume} {m.genre ? `· ${m.genre}` : ""}
        {m.manuelle ? "" : ` · marché ${m.pays ?? "?"}`}
      </p>
      {(m.plaintes ?? []).length > 0 && (
        <details>
          <summary>Plaintes récentes (avis 1-3★, extraits)</summary>
          <ul>
            {(m.plaintes ?? []).map((p, i) => (
              <li key={i}>
                <span className="id">{p.note}★</span> {p.extrait}
              </li>
            ))}
          </ul>
        </details>
      )}
      <form action={trierIdee}>
        <input type="hidden" name="id" value={idea.id} />
        {idea.status !== "a_analyser" && idea.status !== "retenue" && (
          <button className="primary" name="statut" value="a_analyser" type="submit">
            → Gate de viabilité
          </button>
        )}
        {idea.status !== "ecartee" && (
          <button className="subtle" name="statut" value="ecartee" type="submit">
            Écarter
          </button>
        )}
        {idea.status !== "nouvelle" && (
          <button name="statut" value="nouvelle" type="submit">
            Remettre en file
          </button>
        )}
      </form>
    </div>
  );
}

export default async function IdeesPage({
  searchParams,
}: {
  searchParams: Promise<{ fait?: string }>;
}) {
  const { fait } = await searchParams;
  const db = getDb();
  const raw = db
    ? await db
        .select()
        .from(schema.ideas)
        .leftJoin(schema.viabilityReports, eq(schema.viabilityReports.ideaId, schema.ideas.id))
        .orderBy(desc(schema.ideas.score))
        .limit(150)
    : null;

  const rows: Row[] = (raw ?? []).map((r) => ({ idea: r.ideas, report: r.viability_reports }));
  const actives = rows.filter((r) => r.idea.status !== "ecartee");
  const percee = (r: Row) =>
    ((r.report?.dossier as { archetype?: { potentiel_percee_0_100?: number } } | undefined)
      ?.archetype?.potentiel_percee_0_100 ?? 0);
  // GO en tête (triés par potentiel de percée — la fonction objectif),
  // puis pivots, puis la file au gate, puis les nouvelles par score.
  const gos = actives.filter((r) => r.report?.verdict === "go").sort((a, b) => percee(b) - percee(a));
  const pivots = actives.filter((r) => r.report?.verdict === "pivot").sort((a, b) => percee(b) - percee(a));
  const auGate = actives.filter((r) => !r.report && r.idea.status === "a_analyser");
  const kills = actives.filter((r) => r.report?.verdict === "kill");
  const nouvelles = actives.filter((r) => !r.report && r.idea.status !== "a_analyser");
  const ecartees = rows.filter((r) => r.idea.status === "ecartee");

  return (
    <>
      <p className="eyebrow">Étage 0 · Radar</p>
      <h1>Idées</h1>
      <p className="meta">
        Détections du radar (scoring par code) et intuitions manuelles — même file, même
        gate. Aucune app ne se construit sans verdict <code>go</code> retenu par un humain.
      </p>

      {fait === "ajout" && <div className="toast ok" role="status">Idée ajoutée à la file.</div>}
      {fait === "relance" && (
        <div className="toast ok" role="status">Analyse relancée — nouveau dossier dans l&apos;heure.</div>
      )}
      {fait && fait !== "ajout" && fait !== "relance" && (
        <div className="toast ok" role="status">Idée triée.</div>
      )}

      <details className="card manual-idea">
        <summary>+ Ajouter une idée à la main</summary>
        <form action={ajouterIdee} className="costform">
          <label>
            Titre
            <input name="titre" required maxLength={120} placeholder="ex. App de révision du Code pour ados" />
          </label>
          <label>
            Catégorie
            <input name="categorie" maxLength={40} placeholder="EDUCATION, JEU, FORMATION…" />
          </label>
          <label>
            Pourquoi (notes)
            <input name="notes" maxLength={600} placeholder="l'intuition, la douleur observée…" />
          </label>
          <button className="primary" type="submit">Ajouter à la file</button>
        </form>
      </details>

      {raw === null && (
        <div className="notice">Base non configurée (<code>DATABASE_URL</code> absent).</div>
      )}

      {gos.length > 0 && (
        <>
          <h2 className="group-title">
            🟢 GO — prêts pour ta décision <span className="count">({gos.length})</span>
          </h2>
          {gos.map((r) => <IdeaCard key={r.idea.id} {...r} />)}
        </>
      )}

      {pivots.length > 0 && (
        <>
          <h2 className="group-title">
            À pivoter <span className="count">({pivots.length})</span>
          </h2>
          {pivots.map((r) => <IdeaCard key={r.idea.id} {...r} />)}
        </>
      )}

      {auGate.length > 0 && (
        <>
          <h2 className="group-title">
            Au gate <span className="count">({auGate.length} — une analyse par heure)</span>
          </h2>
          {auGate.map((r) => <IdeaCard key={r.idea.id} {...r} />)}
        </>
      )}

      <h2 className="group-title">
        File du radar <span className="count">({nouvelles.length})</span>
      </h2>
      {raw !== null && nouvelles.length === 0 && (
        <p className="empty">File vide — le radar réapprovisionne chaque matin (05:30 UTC).</p>
      )}
      {nouvelles.map((r) => <IdeaCard key={r.idea.id} {...r} />)}

      {kills.length > 0 && (
        <details className="folded">
          <summary>Kills du gate ({kills.length}) — 4 semaines économisées à chaque fois</summary>
          {kills.map((r) => <IdeaCard key={r.idea.id} {...r} />)}
        </details>
      )}
      {ecartees.length > 0 && (
        <details className="folded">
          <summary>Écartées à la main ({ecartees.length})</summary>
          {ecartees.map((r) => <IdeaCard key={r.idea.id} {...r} />)}
        </details>
      )}
    </>
  );
}
