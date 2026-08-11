import { seConnecter } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div className="card" style={{ width: "min(22rem, 90vw)" }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Usine · Cockpit</p>
        <h1 style={{ fontSize: "1.3rem" }}>Connexion</h1>
        {erreur === "identifiants" && (
          <div className="toast err" role="alert">Identifiants incorrects.</div>
        )}
        {erreur === "config" && (
          <div className="toast err" role="alert">Cockpit non configuré (ADMIN_USER/ADMIN_PASSWORD).</div>
        )}
        <form action={seConnecter} className="costform" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <label>
            Utilisateur
            <input name="user" required autoComplete="username" />
          </label>
          <label>
            Mot de passe
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <button className="primary" type="submit">Se connecter</button>
        </form>
      </div>
    </div>
  );
}
