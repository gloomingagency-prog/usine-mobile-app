import { getPromptlandiaDb, type LessonDraft, type LessonStep, type QaReport } from "@/db/promptlandia";
import { approuverDraft, publierApprouves, rejeterDraft } from "./actions";

export const dynamic = "force-dynamic";

// Validation HUMAINE du contenu généré (pipeline contenu/ — l'IA rédige
// en amont, le QA automatique trie, l'humain approuve ICI, la publication
// insère dans `lessons`). Jamais de contenu non validé chez l'enfant.

const STATUT_LABEL: Record<LessonDraft["status"], string> = {
  draft: "Brouillon",
  qa_ok: "QA OK",
  qa_rejected: "QA rejeté",
  approved: "Approuvé",
  published: "Publié",
};
const BADGE_CLASS: Record<LessonDraft["status"], string> = {
  draft: "a_valider",
  qa_ok: "a_valider",
  qa_rejected: "refusee",
  approved: "validee",
  published: "decidee",
};

function StepPreview({ step }: { step: LessonStep }) {
  if (step.type === "text") {
    return (
      <li>
        <span className="id">text</span> {step.content}
      </li>
    );
  }
  if (step.type === "quiz") {
    return (
      <li>
        <span className="id">quiz</span> {step.question}
        <ul>
          {step.options.map((o, i) => (
            <li key={i}>
              {i === step.correct_index ? <b>✓ {o}</b> : o}
            </li>
          ))}
          <li className="detail">↳ {step.explanation}</li>
        </ul>
      </li>
    );
  }
  if (step.type === "tap_reveal") {
    return (
      <li>
        <span className="id">tap_reveal</span> {step.prompt} → {step.reveal}
      </li>
    );
  }
  return (
    <li>
      <span className="id">try_it</span> {step.instruction}
    </li>
  );
}

function QaBadge({ report }: { report: QaReport | null }) {
  const ia = report?.qa_ia;
  if (!ia) return null;
  const scores = [ia.adapte_6_12, ia.factuel, ia.ton_positif, ia.anglais].map((n) => Number(n) || 0);
  const min = Math.min(...scores);
  return (
    <span className={`badge ${min >= 70 ? "validee" : "refusee"}`}>
      QA IA min {min}/100
    </span>
  );
}

function DraftCard({ draft, pathTitle }: { draft: LessonDraft; pathTitle: string }) {
  const report = draft.qa_report;
  const ia = report?.qa_ia;
  return (
    <div className="card decision">
      <div className="head">
        <b>{draft.title}</b>
        <span className="id">
          {draft.path_id} · {pathTitle}
        </span>
        <span className={`badge ${BADGE_CLASS[draft.status]}`}>{STATUT_LABEL[draft.status]}</span>
        <QaBadge report={report} />
        <span className="id">source : {draft.source}</span>
      </div>
      {ia && (
        <p className="detail">
          adapté 6-12 : {ia.adapte_6_12 ?? "?"} · factuel : {ia.factuel ?? "?"} · ton :{" "}
          {ia.ton_positif ?? "?"} · anglais : {ia.anglais ?? "?"}
          {report?.seuils ? ` — ${report.seuils}` : ""}
        </p>
      )}
      {(report?.regles_code?.erreurs ?? []).length > 0 && (
        <p className="detail danger">
          Règles code : {(report?.regles_code?.erreurs ?? []).join(" ; ")}
        </p>
      )}
      {(ia?.problemes ?? []).length > 0 && (
        <p className="detail">Relecture IA : {(ia?.problemes ?? []).join(" ; ")}</p>
      )}
      <details>
        <summary>Aperçu des {draft.steps.length} étapes</summary>
        <ol>
          {draft.steps.map((s, i) => (
            <StepPreview key={i} step={s} />
          ))}
        </ol>
      </details>
      {(draft.status === "qa_ok" || draft.status === "approved") && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
          {draft.status === "qa_ok" && (
            <form action={approuverDraft}>
              <input type="hidden" name="id" value={draft.id} />
              <button className="primary" type="submit">
                Approuver
              </button>
            </form>
          )}
          <form action={rejeterDraft}>
            <input type="hidden" name="id" value={draft.id} />
            <button className="subtle" type="submit">
              Rejeter
            </button>
          </form>
        </div>
      )}
      {draft.status === "published" && draft.published_lesson_id && (
        <p className="detail">
          leçon publiée : <code>{draft.published_lesson_id}</code>
        </p>
      )}
    </div>
  );
}

export default async function ContenuPage({
  searchParams,
}: {
  searchParams: Promise<{ fait?: string; n?: string }>;
}) {
  const { fait, n } = await searchParams;
  const sql = getPromptlandiaDb();
  const drafts = sql
    ? ((await sql`
        select id, path_id, title, order_index, steps, status, qa_report,
               source, published_lesson_id, created_at
        from lesson_drafts
        order by created_at desc`) as unknown as LessonDraft[])
    : null;
  const paths = sql
    ? ((await sql`select id, title from learning_paths`) as unknown as { id: string; title: string }[])
    : [];
  const titreParcours = new Map(paths.map((p) => [p.id, p.title]));

  const rows = drafts ?? [];
  const aValider = rows.filter((d) => d.status === "qa_ok");
  const approuves = rows.filter((d) => d.status === "approved");
  const rejetes = rows.filter((d) => d.status === "qa_rejected");
  const publies = rows.filter((d) => d.status === "published");

  return (
    <>
      <p className="eyebrow">Pipeline contenu · PromptLandia</p>
      <h1>Contenu généré</h1>
      <p className="meta">
        L&apos;IA rédige EN AMONT (<code>contenu/</code>), le QA automatique trie (règles code +
        contre-lecture IA, verdict par code), <b>tu valides ici</b> — la publication insère dans{" "}
        <code>lessons</code>. Jamais de contenu non validé chez l&apos;enfant.
      </p>

      {fait === "approuve" && <div className="toast ok" role="status">Brouillon approuvé — publiable.</div>}
      {fait === "rejete" && <div className="toast ok" role="status">Brouillon rejeté.</div>}
      {fait === "publie" && (
        <div className="toast ok" role="status">
          {n ?? "0"} leçon(s) publiée(s) dans PromptLandia.
        </div>
      )}

      {drafts === null && (
        <div className="notice">
          Base PromptLandia non configurée (<code>PROMPTLANDIA_DATABASE_URL</code> absent).
        </div>
      )}

      {approuves.length > 0 && (
        <>
          <h2 className="group-title">
            Approuvés — prêts à publier <span className="count">({approuves.length})</span>
          </h2>
          <form action={publierApprouves}>
            <button className="primary" type="submit">
              Publier les approuvés ({approuves.length})
            </button>
          </form>
          {approuves.map((d) => (
            <DraftCard key={d.id} draft={d} pathTitle={titreParcours.get(d.path_id) ?? "?"} />
          ))}
        </>
      )}

      <h2 className="group-title">
        QA OK — à valider <span className="count">({aValider.length})</span>
      </h2>
      {drafts !== null && aValider.length === 0 && (
        <p className="empty">
          Rien à valider — générer : <code>node contenu/index.mjs --path lp-X --count N</code>.
        </p>
      )}
      {aValider.map((d) => (
        <DraftCard key={d.id} draft={d} pathTitle={titreParcours.get(d.path_id) ?? "?"} />
      ))}

      {rejetes.length > 0 && (
        <details className="folded">
          <summary>Rejetés par le QA ou l&apos;humain ({rejetes.length})</summary>
          {rejetes.map((d) => (
            <DraftCard key={d.id} draft={d} pathTitle={titreParcours.get(d.path_id) ?? "?"} />
          ))}
        </details>
      )}
      {publies.length > 0 && (
        <details className="folded">
          <summary>Publiés ({publies.length})</summary>
          {publies.map((d) => (
            <DraftCard key={d.id} draft={d} pathTitle={titreParcours.get(d.path_id) ?? "?"} />
          ))}
        </details>
      )}
    </>
  );
}
