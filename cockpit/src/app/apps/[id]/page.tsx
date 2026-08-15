import { notFound } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

import { STATUS_LABEL, statusBadgeClass } from "@/lib/app-status";
import { basculerMaillon } from "./actions";

type Maillon = { code: string; titre: string; fait: boolean };
type Attente = { texte: string; qui: string; fait?: boolean };
type LastBuild = {
  platform?: string;
  status?: string;
  url?: string;
  artifact?: string;
  at?: string;
  erreur?: string | null;
};
type Meta = {
  repoUrl?: string;
  ideaId?: string;
  maillons?: Maillon[];
  attentes?: Attente[];
  lastBuild?: LastBuild;
};

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

      {meta.lastBuild && (
        <div className="card decision">
          <div className="head">
            <b>Dernier build</b>
            <span className="id">{meta.lastBuild.platform}</span>
            <span
              className={`badge ${
                meta.lastBuild.status === "finished"
                  ? "validee"
                  : meta.lastBuild.status === "errored"
                    ? "refusee"
                    : "a_valider"
              }`}
            >
              {meta.lastBuild.status}
            </span>
            {meta.lastBuild.at && <span className="id">{meta.lastBuild.at.slice(0, 16).replace("T", " ")} UTC</span>}
          </div>
          {/* Le lien d'installation est l'action principale de cette
              carte, et elle se fait DEPUIS UN TÉLÉPHONE : bouton pleine
              largeur, pas un lien noyé dans une phrase. */}
          {meta.lastBuild.artifact && meta.lastBuild.status === "finished" && (
            <a className="primary bouton-installer" href={meta.lastBuild.artifact}>
              📲 Installer l&apos;app (APK)
            </a>
          )}
          <p className="detail">
            {meta.lastBuild.url && (
              <a href={meta.lastBuild.url} target="_blank" rel="noreferrer">
                page du build
              </a>
            )}
            {meta.lastBuild.erreur && <span className="danger"> {meta.lastBuild.erreur}</span>}
          </p>
        </div>
      )}

      {maillons.length > 0 && (
        <>
          <h2>
            Maillons <span className="count">({faits}/{maillons.length})</span>
          </h2>
          <div className="meter" role="img" aria-label={`${faits} maillons sur ${maillons.length}`}>
            <div
              className={`fill ${faits === maillons.length ? "ok-bg" : "warn-bg"}`}
              style={{ width: `${Math.max((faits / maillons.length) * 100, 4)}%` }}
            />
          </div>
          <div className="tablewrap">
            <table>
              <tbody>
                {maillons.map((m) => (
                  <tr key={m.code}>
                    <td style={{ width: "3.5rem" }}>
                      <b>{m.code}</b>
                    </td>
                    <td>{m.titre}</td>
                    <td style={{ width: "10rem" }}>
                      <form action={basculerMaillon} style={{ display: "inline" }}>
                        <input type="hidden" name="appId" value={app.id} />
                        <input type="hidden" name="code" value={m.code} />
                        {m.fait ? (
                          <>
                            <span className="badge validee">fait</span>{" "}
                            <button type="submit">rouvrir</button>
                          </>
                        ) : (
                          <button className="primary" type="submit">
                            marquer fait
                          </button>
                        )}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(meta.attentes ?? []).length > 0 && (
        <>
          <h2>Qui-fait-quoi — actions attendues</h2>
          <div className="tablewrap">
            <table>
              <tbody>
                {(meta.attentes ?? []).map((a, i) => (
                  <tr key={i}>
                    <td>{a.texte}</td>
                    <td style={{ width: "8rem" }}>
                      <span className={`badge ${a.fait ? "validee" : a.qui === "toi" ? "a_valider" : "decidee"}`}>
                        {a.fait ? "reçu ✓" : a.qui}
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
