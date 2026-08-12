import Link from "next/link";
import { getDb, schema } from "@/db";
import { STATUS_LABEL, statusBadgeClass } from "@/lib/app-status";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const db = getDb();
  const rows = db ? await db.select().from(schema.apps) : null;

  return (
    <>
      <p className="eyebrow">Portfolio</p>
      <h1>Apps</h1>
      <p className="meta">
        Chaque app traverse la machine à états du pipeline — de l&apos;idée au sunset.
        La composition cible (D9) : ~70 % compounding · 20 % cash · 10 % loterie.
      </p>

      {rows === null && (
        <div className="notice">
          Base non configurée (<code>DATABASE_URL</code> absent).
        </div>
      )}

      {(rows === null || rows.length === 0) && (
        <div className="empty">
          <p>Aucune app pour l&apos;instant.</p>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <ul className="doclist">
          {rows.map((a) => {
            const meta = (a.meta ?? {}) as { maillons?: { fait: boolean }[] };
            const maillons = meta.maillons ?? [];
            const faits = maillons.filter((m) => m.fait).length;
            return (
              <li key={a.id}>
                <Link href={`/apps/${encodeURIComponent(a.id)}`}>
                  <span className="card">
                    <b>
                      {a.name}{" "}
                      <span className={`badge ${statusBadgeClass(a.status)}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </b>
                    <span>
                      créée le {a.createdAt.toISOString().slice(0, 10)}
                      {maillons.length > 0 && ` · maillons : ${faits}/${maillons.length}`}
                      {" · fiche complète →"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
