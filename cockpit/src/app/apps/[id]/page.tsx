import { notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

import { STATUS_LABEL, statusBadgeClass } from "@/lib/app-status";

type Maillon = { code: string; titre: string; fait: boolean };
type Meta = { repoUrl?: string; ideaId?: string; maillons?: Maillon[] };

export default async function AppFichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (!db) notFound();
  const rows = await db.select().from(schema.apps).where(eq(schema.apps.id, id)).limit(1);
  if (rows.length === 0) notFound();
  const app = rows[0];
  const meta = (app.meta ?? {}) as Meta;
  const events = await db
    .select()
    .from(schema.appEvents)
    .where(eq(schema.appEvents.appId, id))
    .orderBy(desc(schema.appEvents.at))
    .limit(50);
  const maillons = meta.maillons ?? [];
  const faits = maillons.filter((m) => m.fait).length;

  return (
    <>
      <p className="meta">
        <Link href="/apps">← Portfolio</Link>
      </p>
      <p className="eyebrow">Fiche app · pipeline vivant</p>
      <h1>
        {app.name}{" "}
        <span className={`badge ${statusBadgeClass(app.status)}`}>
          {STATUS_LABEL[app.status] ?? app.status}
        </span>
      </h1>
      <p className="meta">
        Créée le {app.createdAt.toISOString().slice(0, 10)}
        {meta.repoUrl && (
          <>
            {" · "}
            <a href={meta.repoUrl} target="_blank" rel="noreferrer">
              Repo GitHub
            </a>
            {" · "}
            <a href={`${meta.repoUrl}/blob/main/docs/planning/CADRAGE.md`} target="_blank" rel="noreferrer">
              Cadrage
            </a>
            {" · "}
            <a
              href={`${meta.repoUrl}/blob/main/docs/planning/AUDIT_PRE_IMPLEMENTATION.md`}
              target="_blank"
              rel="noreferrer"
            >
              Audit
            </a>
          </>
        )}
        {meta.ideaId && (
          <>
            {" · "}
            <Link href={`/viabilite/${encodeURIComponent(meta.ideaId)}`}>Dossier de viabilité</Link>
          </>
        )}
      </p>

      {maillons.length > 0 && (
        <>
          <h2>
            Maillons <span className="count">({faits}/{maillons.length})</span>
          </h2>
          <div className="tablewrap">
            <table>
              <tbody>
                {maillons.map((m) => (
                  <tr key={m.code}>
                    <td style={{ width: "4rem" }}>
                      <b>{m.code}</b>
                    </td>
                    <td>{m.titre}</td>
                    <td style={{ width: "7rem" }}>
                      <span className={`badge ${m.fait ? "validee" : "a_valider"}`}>
                        {m.fait ? "fait" : "à faire"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Historique d&apos;états</h2>
      {events.length === 0 && <p className="empty">Aucun événement.</p>}
      {events.length > 0 && (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Date (UTC)</th>
                <th>Transition</th>
                <th>Acteur</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.at.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td>
                    {e.fromStatus ? `${STATUS_LABEL[e.fromStatus] ?? e.fromStatus} → ` : ""}
                    <b>{STATUS_LABEL[e.toStatus] ?? e.toStatus}</b>
                  </td>
                  <td className="src">{e.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
