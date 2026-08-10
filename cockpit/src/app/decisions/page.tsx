import { decide, listDecisions } from "./actions";

export const dynamic = "force-dynamic";

const STATUT_LABEL: Record<string, string> = {
  a_valider: "À valider",
  validee: "Validée",
  refusee: "Refusée",
  decidee: "Décidée",
};

const VERDICT_TOAST: Record<string, string> = {
  validee: "validée",
  refusee: "refusée",
  a_valider: "rouverte",
};

const dateUTC = (d: Date | null | undefined) =>
  d ? `${d.toISOString().slice(0, 10)} (UTC)` : null;

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ fait?: string; verdict?: string }>;
}) {
  const { fait, verdict } = await searchParams;
  const { source, rows } = await listDecisions();
  const aValider = rows.filter((d) => d.statut === "a_valider");
  const tranchees = rows.filter((d) => d.statut !== "a_valider");

  return (
    <>
      <p className="eyebrow">Gates humains</p>
      <h1>Décisions</h1>
      <p className="meta">
        Les décisions se prennent ici — le repo garde la trace markdown, le cockpit est
        l&apos;interface d&apos;action. Détail et justifications : rubrique Docs
        (CADRAGE_USINE).
      </p>

      {fait && VERDICT_TOAST[verdict ?? ""] && (
        <div className="toast ok" role="status">
          Décision {fait} {VERDICT_TOAST[verdict ?? ""]}.
        </div>
      )}

      {source === "seed" && (
        <div className="notice">
          Base non configurée (<code>DATABASE_URL</code> absent — .env à venir) : données
          de cadrage en lecture seule. Les boutons seront actifs dès que la base Neon
          sera branchée.
        </div>
      )}

      <h2>À traiter ({aValider.length})</h2>
      {aValider.length === 0 && <p className="empty">Rien à traiter — tout est tranché.</p>}
      {aValider.map((d) => (
        <div className="card decision" key={d.id}>
          <div className="head">
            <span className="id">{d.id}</span>
            <b>{d.titre}</b>
            <span className={`badge ${d.statut}`}>{STATUT_LABEL[d.statut]}</span>
          </div>
          <p className="detail">{d.detail}</p>
          <p className="proposition">
            <b>Proposition :</b> {d.proposition}
          </p>
          {source === "db" && (
            <form action={decide}>
              <input type="hidden" name="id" value={d.id} />
              <input
                name="commentaire"
                maxLength={500}
                placeholder="Commentaire (optionnel)"
                aria-label={`Commentaire pour ${d.id}`}
              />
              <button className="primary" name="verdict" value="validee" type="submit">
                Valider la proposition
              </button>
              <button className="subtle" name="verdict" value="refusee" type="submit">
                Refuser
              </button>
            </form>
          )}
        </div>
      ))}

      <h2>Tranchées ({tranchees.length})</h2>
      {tranchees.map((d) => (
        <div className="card decision" key={d.id}>
          <div className="head">
            <span className="id">{d.id}</span>
            <b>{d.titre}</b>
            <span className={`badge ${d.statut}`}>{STATUT_LABEL[d.statut]}</span>
            {dateUTC(d.decideLe) && <span className="id">le {dateUTC(d.decideLe)}</span>}
          </div>
          <p className="proposition">{d.proposition}</p>
          {d.commentaire && <p className="detail">{d.commentaire}</p>}
          {source === "db" && (
            <form action={decide}>
              <input type="hidden" name="id" value={d.id} />
              <button className="subtle" name="verdict" value="a_valider" type="submit">
                Rouvrir
              </button>
            </form>
          )}
        </div>
      ))}
    </>
  );
}
