import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// La base n'est accessible QUE côté serveur (server actions / RSC).
// Sans DATABASE_URL (.env à venir), le cockpit tourne en mode dégradé :
// les pages affichent les données de seed en lecture seule.
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return drizzle(neon(url), { schema });
}

export { schema };
