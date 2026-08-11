import { desc } from "drizzle-orm";
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

export default async function IdeesPage({
  searchParams,
}: {
  searchParams: Promise<{ fait?: string }>;
}) {
  const { fait } = await searchParams;
  const db = getDb();
  const rows = db
    ? await db.select().from(schema.ideas).orderBy(desc(schema.ideas.score)).limit(100)
    : null;

  return (
    <>
      <p className="eyebrow">Étage 0 · Radar</p>
      <h1>Idées</h1>
      <p className="meta">
        Incumbents faibles sur besoin prouvé, détectés par le cron quotidien (scoring par
        code : demande × faiblesse du leader × moat d&apos;avis). « À analyser » = candidat
        au gate de viabilité. Aucune app ne se construit sans verdict <code>go</code>.
      </p>

      {fait === "ajout" && <div className="toast ok" role="status">Idée ajoutée à la file.</div>}
      {fait && fait !== "ajout" && <div className="toast ok" role="status">Idée triée.</div>}

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
      {rows === null && (
        <div className="notice">Base non configurée (<code>DATABASE_URL</code> absent).</div>
      )}
      {rows !== null && rows.length === 0 && (
        <p className="empty">
          Aucune idée pour l&apos;instant — le radar écrira ici à son premier passage
          (heartbeat visible sur la page Statut).
        </p>
      )}

      {(rows ?? []).map((idea) => {
        const m = idea.metrics as Metrics;
        return (
          <div className="card decision" key={idea.id}>
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
              <span className={`badge ${BADGE_CLASS[idea.status]}`}>
                {STATUT_LABEL[idea.status]}
              </span>
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
              <button className="primary" name="statut" value="a_analyser" type="submit">
                → Gate de viabilité
              </button>
              <button className="subtle" name="statut" value="ecartee" type="submit">
                Écarter
              </button>
              {idea.status !== "nouvelle" && (
                <button name="statut" value="nouvelle" type="submit">
                  Remettre en file
                </button>
              )}
            </form>
          </div>
        );
      })}
    </>
  );
}
