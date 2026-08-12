import { sql, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

// Page PUBLIQUE (hors Basic Auth, voir middleware) : lecture seule, zéro
// donnée sensible — heartbeat par job, âge du dernier passage, état base.
// C'est ce qui rend un trou de 16 jours visible en un regard.

type JobRow = {
  job: string;
  status: string;
  lastAt: Date;
  expectedEverySec: number | null;
};

async function fetchStatus() {
  const db = getDb();
  if (!db) return { dbOk: false as const, jobs: [] as JobRow[] };
  try {
    await db.execute(sql`select 1`);
    const rows = await db
      .select()
      .from(schema.cronHeartbeats)
      .orderBy(desc(schema.cronHeartbeats.startedAt))
      .limit(500);
    const byJob = new Map<string, JobRow>();
    for (const r of rows) {
      if (!byJob.has(r.job)) {
        byJob.set(r.job, {
          job: r.job,
          status: r.status,
          lastAt: r.finishedAt ?? r.startedAt,
          expectedEverySec: r.expectedEverySec,
        });
      }
    }
    return { dbOk: true as const, jobs: [...byJob.values()] };
  } catch {
    return { dbOk: false as const, jobs: [] as JobRow[] };
  }
}

// Santé des BFF des apps du portfolio (même philosophie : vérifier le
// VÉCU — un fetch réel — pas une hypothèse de bon fonctionnement).
const BFFS: { nom: string; url: string }[] = [
  { nom: "PromptLandia BFF", url: "https://promptlandia-bff.vercel.app/api/health" },
];

async function checkBff(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

function ageLabel(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export default async function StatutPage() {
  const { dbOk, jobs } = await fetchStatus();
  const now = Date.now();

  return (
    <>
      <p className="eyebrow">Page publique · lecture seule</p>
      <h1>Statut de l&apos;usine</h1>
      <p className="meta">
        Heartbeat par agent/cron. Un job silencieux au-delà de 2× sa cadence est une
        PANNE, pas un retard.
      </p>

      <div className="cols">
        <div className="card">
          <h3>Base de pilotage</h3>
          <p className={dbOk ? "ok" : "danger"}>{dbOk ? "Opérationnelle" : "Inaccessible"}</p>
        </div>
        <div className="card">
          <h3>Cockpit</h3>
          <p className="ok">En ligne</p>
        </div>
        {await Promise.all(
          BFFS.map(async (b) => {
            const ok = await checkBff(b.url);
            return (
              <div className="card" key={b.nom}>
                <h3>{b.nom}</h3>
                <p className={ok ? "ok" : "danger"}>{ok ? "Opérationnel" : "Injoignable"}</p>
              </div>
            );
          }),
        )}
      </div>

      <h2>Agents & crons ({jobs.length})</h2>
      {jobs.length === 0 && (
        <p className="empty">
          Aucun cron enregistré pour l&apos;instant — le premier (radar d&apos;avis, sur le
          VPS) écrira son heartbeat ici à chaque passage.
        </p>
      )}
      {jobs.length > 0 && (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>État</th>
                <th>Dernier passage</th>
                <th>Prochain attendu</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const age = now - j.lastAt.getTime();
                const silent =
                  j.expectedEverySec !== null && age > 2 * j.expectedEverySec * 1000;
                const cls =
                  silent || j.status === "error" ? "danger" : j.status === "running" ? "warn" : "ok";
                const label = silent ? "SILENCIEUX (panne)" : j.status === "ok" ? "OK" : j.status;
                const prochain =
                  j.expectedEverySec !== null
                    ? new Date(j.lastAt.getTime() + j.expectedEverySec * 1000)
                    : null;
                return (
                  <tr key={j.job}>
                    <td>
                      <b>{j.job}</b>
                    </td>
                    <td className={cls}>{label}</td>
                    <td>{ageLabel(age)}</td>
                    <td>
                      {prochain
                        ? `${prochain.toISOString().slice(0, 16).replace("T", " ")} UTC`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
