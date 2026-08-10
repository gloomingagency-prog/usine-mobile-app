import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  idea: "Idée",
  analyzing: "En analyse",
  killed: "Tuée",
  pivot: "À pivoter",
  viable: "Viable",
  scoping: "Cadrage",
  building: "En build",
  internal_testing: "Test interne",
  store_review: "En review",
  rejected: "Rejetée",
  live: "Live",
  improving: "En amélioration",
  sunset_proposed: "Sunset proposé",
  sunset: "Sunset",
};

export default async function AppsPage() {
  const db = getDb();
  const rows = db ? await db.select().from(schema.apps) : null;

  return (
    <>
      <p className="eyebrow">Portfolio</p>
      <h1>Apps</h1>
      <p className="meta">
        Chaque app traverse la machine à états du pipeline — de l&apos;idée au sunset.
      </p>

      {rows === null && (
        <div className="notice">
          Base non configurée (<code>DATABASE_URL</code> absent — .env à venir).
        </div>
      )}

      {(rows === null || rows.length === 0) && (
        <div className="empty">
          <p>Aucune app pour l&apos;instant.</p>
          <p>
            La première entrera par le <b>Radar</b> (étage 0) une fois les niches cibles
            validées (décision D6) — puis traversera le gate de viabilité avant toute
            ligne de code.
          </p>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>App</th>
                <th>Statut</th>
                <th>Créée le</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.name}</b>
                  </td>
                  <td>
                    <span className="badge decidee">{STATUS_LABEL[a.status] ?? a.status}</span>
                  </td>
                  <td>{a.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
