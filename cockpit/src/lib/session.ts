// Session par cookie signé (HMAC via Web Crypto — compatible edge).
// Raison d'être : les Server Actions passent par fetch(), qui ne
// rattache pas les identifiants Basic Auth selon les navigateurs —
// les boutons du cockpit ne faisaient "rien" (401 silencieux, incident
// 2026-08-11). Un cookie httpOnly part avec chaque requête, toujours.

const COOKIE = "cockpit_session";

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(secret: string, ttlMs = 30 * 24 * 3600 * 1000) {
  const exp = Date.now() + ttlMs;
  const sig = await hmacHex(secret, `cockpit:${exp}`);
  return { token: `${exp}.${sig}`, exp };
}

export async function verifySessionToken(secret: string, token: string | undefined): Promise<boolean> {
  if (!secret || !token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp || !sig) return false;
  const attendu = await hmacHex(secret, `cockpit:${exp}`);
  if (sig.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ attendu.charCodeAt(i);
  return diff === 0;
}

export const SESSION_COOKIE = COOKIE;
