import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PROCEDURES, ENTITE, type EtapeProcedure } from "@/lib/procedures-seed";
import { FicheEntite } from "./entite";
import { basculerEtape } from "./actions";

export const dynamic = "force-dynamic";

// COMPTES ET DÉMARCHES — ce qui bloque le portfolio entier.
//
// Ces démarches ne sont propres à aucune app : elles se font une fois et
// conditionnent toutes les sorties. Elles vivent ici, cochables depuis
// le téléphone, au moment où l'étape est faite — pas le soir dans un
// fichier qu'on oublie de tenir à jour.
//
// La page distingue deux natures d'étape, parce que la confusion entre
// les deux fait perdre des semaines : ce sur quoi on peut AGIR, et ce
// qu'on ne peut qu'ATTENDRE. Un délai administratif n'est pas une tâche
// en retard ; le confondre pousse à relancer inutilement, ou pire, à
// croire qu'on avance alors qu'on patiente.

export default async function ComptesPage() {
  const db = getDb();
  const enBase = db
    ? await db.select().from(schema.procedures).orderBy(asc(schema.procedures.rang))
    : [];

  // Le contenu de référence vit dans le code ; la base ne porte que
  // l'AVANCEMENT. Une procédure absente de la base s'affiche quand même,
  // avec ses cases vides : on ne cache jamais une démarche parce que la
  // graine n'a pas encore été semée.
  const avancement = new Map(
    enBase.map((p) => [p.id, ((p.etapes ?? []) as EtapeProcedure[])]),
  );

  const procedures = PROCEDURES.map((ref) => {
    const suivi = avancement.get(ref.id) ?? [];
    const etapes = ref.etapes.map((e) => ({
      ...e,
      fait: suivi.find((s) => s.code === e.code)?.fait ?? false,
    }));
    return { ...ref, etapes };
  });

  return (
    <>
      <p className="eyebrow">Comptes et démarches · une fois pour tout le portfolio</p>
      <h1>Comptes développeur</h1>
      <p className="meta">
        Ces démarches ne dépendent d&apos;aucune app. Tant qu&apos;elles ne sont pas
        faites, rien ne se publie — quel que soit l&apos;état du code.
      </p>

      {/* Sommaire : la page est longue, et l'identité de l'entité s'y
          perdait entre les listes d'étapes. */}
      <p className="meta" style={{ marginTop: 12 }}>
        Sur cette page : <a href="#entite">l&apos;entité</a>
        {PROCEDURES.map((p) => (
          <span key={p.id}>
            {" · "}
            <a href={`#${p.id}`}>{p.titre.split(" — ")[0]}</a>
          </span>
        ))}
        {" · "}
        <Link href="/apps/promptlandia">fiche de l&apos;app →</Link>
      </p>

      <div id="entite" style={{ marginTop: 24, scrollMarginTop: 16 }}>
        <FicheEntite
          nom={ENTITE.nom}
          lignes={[
            { label: "Dénomination légale", valeur: ENTITE.nom },
            { label: "Forme", valeur: ENTITE.forme },
            { label: "État de constitution", valeur: ENTITE.etat },
            { label: "Identifiant d'État", valeur: ENTITE.idEtat },
            { label: "Numéro de dépôt", valeur: ENTITE.numeroDepot },
            { label: "Date de constitution", valeur: ENTITE.dateConstitution },
            { label: "Adresse (siège et courrier)", valeur: ENTITE.adresse },
            { label: "Agent enregistré", valeur: ENTITE.agentEnregistre },
            { label: "Associé", valeur: ENTITE.associe },
            { label: "Activité déclarée", valeur: ENTITE.activiteDeclaree },
            { label: "Exercice comptable", valeur: ENTITE.exerciceComptable },
            { label: "Rapport annuel", valeur: ENTITE.rapportAnnuel },
            { label: "Numéro fiscal fédéral (EIN)", valeur: ENTITE.einStatut, alerte: true },
          ]}
        />
      </div>

      {procedures.map((p) => {
        const faites = p.etapes.filter((e) => e.fait).length;
        const total = p.etapes.length;
        const prochaine = p.etapes.find((e) => !e.fait);
        return (
          <section key={p.id} id={p.id} className="carte" style={{ marginTop: 24, scrollMarginTop: 16 }}>
            <h2>{p.titre}</h2>
            <p className="meta">{p.pourquoi}</p>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${total > 0 ? (faites / total) * 100 : 0}%`,
                    height: "100%",
                    background: faites === total ? "#22c55e" : "#6366f1",
                  }}
                />
              </div>
              <span className="id">
                {faites}/{total}
              </span>
            </div>

            {/* Dire CE QU'IL FAUT FAIRE MAINTENANT, une seule chose. Une
                liste de dix étapes sans point d'entrée se lit comme un
                mur et ne se commence jamais. */}
            {prochaine && (
              <p className={prochaine.qui === "attente" ? "meta" : "danger"} style={{ marginBottom: 16 }}>
                {prochaine.qui === "attente"
                  ? `⏳ En attente : ${prochaine.titre.toLowerCase()}. Rien à faire de votre côté.`
                  : `→ Prochaine action : ${prochaine.titre}`}
              </p>
            )}
            {!prochaine && <p style={{ color: "#22c55e", marginBottom: 16 }}>✓ Démarche terminée.</p>}

            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
              {p.etapes.map((e, i) => (
                <li
                  key={e.code}
                  style={{
                    display: "flex",
                    gap: 12,
                    opacity: e.fait ? 0.5 : 1,
                    alignItems: "flex-start",
                  }}
                >
                  <form action={basculerEtape}>
                    <input type="hidden" name="procedureId" value={p.id} />
                    <input type="hidden" name="code" value={e.code} />
                    <button
                      type="submit"
                      aria-label={e.fait ? `Rouvrir : ${e.titre}` : `Marquer fait : ${e.titre}`}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        border: `1px solid ${e.fait ? "#22c55e" : "rgba(255,255,255,0.2)"}`,
                        background: e.fait ? "rgba(34,197,94,0.16)" : "transparent",
                        color: e.fait ? "#22c55e" : "rgba(255,255,255,0.4)",
                        cursor: "pointer",
                        fontSize: 15,
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      {e.fait ? "✓" : i + 1}
                    </button>
                  </form>
                  <div style={{ flex: 1 }}>
                    <strong style={{ textDecoration: e.fait ? "line-through" : "none" }}>
                      {e.titre}
                    </strong>
                    {e.qui === "attente" && <span className="badge" style={{ marginLeft: 8 }}>attente</span>}
                    <p className="meta" style={{ margin: "4px 0 0" }}>
                      {e.detail}
                    </p>
                    {e.attention && (
                      <p className="danger" style={{ margin: "6px 0 0", fontSize: 13 }}>
                        ⚠ {e.attention}
                      </p>
                    )}
                    {e.lien && (
                      <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                        <a href={e.lien} target="_blank" rel="noreferrer">
                          Ouvrir la page ↗
                        </a>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <p className="meta" style={{ marginTop: 24 }}>
        Les règles des boutiques changent sans préavis. Ces étapes disent l&apos;ordre et
        les pièges ; l&apos;écran réel de la console prime toujours sur ce texte.
      </p>
    </>
  );
}
