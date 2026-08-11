import { addCost, listCosts } from "./actions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  ia: "Tokens IA",
  build: "Builds",
  store: "Stores",
  infra: "Infra",
  ads: "Marketing",
  outils: "Outils",
};

const euros = (cents: number) => `${(cents / 100).toFixed(2)} $`;

export default async function CoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ ajout?: string; erreur?: string }>;
}) {
  const { ajout, erreur } = await searchParams;
  const rows = await listCosts();
  const total = rows?.reduce((s, c) => s + c.amountCents, 0) ?? 0;
  const parKind = new Map<string, number>();
  for (const c of rows ?? []) parKind.set(c.kind, (parKind.get(c.kind) ?? 0) + c.amountCents);

  return (
    <>
      <p className="eyebrow">Budget observé, pas déclaré</p>
      <h1>Coûts</h1>
      <p className="meta">
        Chaque dépense réelle de l&apos;usine et des apps, enregistrée quand elle est
        engagée. Plafond décidé (D7) : première app ≤ 50-100 $.
      </p>

      {ajout === "ok" && <div className="toast ok" role="status">Dépense enregistrée.</div>}
      {erreur === "saisie" && (
        <div className="toast err" role="alert">
          Saisie invalide : libellé (≤ 120 car.), catégorie et montant entre 0 et 100 000 $.
        </div>
      )}

      {rows === null && (
        <div className="notice">
          Base non configurée (<code>DATABASE_URL</code> absent).
        </div>
      )}

      {rows !== null && (
        <>
          <div className="cols">
            <div className="card">
              <h3>Total engagé</h3>
              <p className="big">{euros(total)}</p>
            </div>
            {[...parKind.entries()].map(([k, v]) => (
              <div className="card" key={k}>
                <h3>
                  <span className={`dot dot-${k}`} aria-hidden="true" />
                  {KIND_LABEL[k] ?? k}
                </h3>
                <p className="big">{euros(v)}</p>
              </div>
            ))}
          </div>

          <h2>Dépenses connues à engager</h2>
          <p className="meta">
            Un clic au moment où tu les engages — rien n&apos;est enregistré d&apos;avance.
          </p>
          <div className="presets">
            <form action={addCost}>
              <input type="hidden" name="label" value="Compte développeur Google Play (une fois)" />
              <input type="hidden" name="kind" value="store" />
              <input type="hidden" name="amount" value="25" />
              <button type="submit">+ Compte Google Play — 25 $</button>
            </form>
            <form action={addCost}>
              <input type="hidden" name="label" value="Apple Developer Program (annuel)" />
              <input type="hidden" name="kind" value="store" />
              <input type="hidden" name="amount" value="99" />
              <button type="submit">+ Apple Developer — 99 $/an</button>
            </form>
          </div>

          <h2>Ajouter une dépense</h2>
          <form action={addCost} className="card costform">
            <label>
              Libellé
              <input name="label" required maxLength={120} placeholder="ex. Compte Google Play (une fois)" />
            </label>
            <label>
              Catégorie
              <select name="kind" required defaultValue="outils">
                {Object.entries(KIND_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Montant ($)
              <input name="amount" required inputMode="decimal" placeholder="25.00" />
            </label>
            <button className="primary" type="submit">
              Enregistrer
            </button>
          </form>

          <h2>Historique ({rows.length})</h2>
          {rows.length === 0 && (
            <p className="empty">Aucune dépense engagée pour l&apos;instant — 0 $.</p>
          )}
          {rows.length > 0 && (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Date (UTC)</th>
                    <th>Libellé</th>
                    <th>Catégorie</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>{c.at.toISOString().slice(0, 10)}</td>
                      <td>{c.label}</td>
                      <td>
                        <span className={`dot dot-${c.kind}`} aria-hidden="true" />
                        {KIND_LABEL[c.kind] ?? c.kind}
                      </td>
                      <td>{euros(c.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
