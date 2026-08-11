import { createHmac, timingSafeEqual } from "node:crypto";

// Liens d'action signés (e-mails) : HMAC-SHA256 sur id:statut:exp avec
// CRON_SECRET. Expiration courte — un e-mail n'est pas une session.
export function signerAction(id: string, statut: string, expMs: number): string {
  const secret = process.env.CRON_SECRET ?? "";
  return createHmac("sha256", secret).update(`${id}:${statut}:${expMs}`).digest("hex");
}

export function verifierAction(id: string, statut: string, expMs: number, sig: string): boolean {
  if (!process.env.CRON_SECRET) return false; // fail-closed
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;
  const attendu = signerAction(id, statut, expMs);
  const a = Buffer.from(attendu, "hex");
  const b = Buffer.from(sig || "0", "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function lienAction(base: string, id: string, statut: string): string {
  const exp = Date.now() + 7 * 24 * 3600 * 1000; // 7 jours
  const sig = signerAction(id, statut, exp);
  const p = new URLSearchParams({ id, statut, exp: String(exp), sig });
  return `${base}/api/idee-action?${p.toString()}`;
}
