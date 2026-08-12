import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Le cockpit prend des décisions : jamais exposé sans authentification.
// Auth par COOKIE de session signé (les Server Actions passent par
// fetch(), qui ne rattache pas Basic Auth selon les navigateurs —
// incident « les boutons ne font rien », 2026-08-11). Basic Auth reste
// accepté en ALTERNATIVE pour les scripts/curl.
export async function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET || process.env.CRON_SECRET || "";
  if (!user || !password) {
    // Fail-closed : sans identifiants configurés, on n'expose rien.
    return new NextResponse("Cockpit non configuré (ADMIN_USER/ADMIN_PASSWORD).", {
      status: 503,
    });
  }

  // 1 · Cookie de session valide ?
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(secret, token)) return NextResponse.next();

  // 2 · Basic Auth valide (scripts, curl) ?
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (decoded.slice(0, idx) === user && decoded.slice(idx + 1) === password) {
      return NextResponse.next();
    }
  }

  // 3 · Sinon : page de connexion pour le navigateur, 401 pour le reste.
  const accepteHtml = (req.headers.get("accept") ?? "").includes("text/html");
  if (accepteHtml && req.method === "GET") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return new NextResponse("Authentification requise.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Usine Cockpit", charset="UTF-8"' },
  });
}

export const config = {
  // Public : statut (lecture seule), veille (CRON_SECRET), idee-action
  // (signature HMAC), login (le point d'entrée), assets Next.
  // /api/eas-webhook est protégé par signature HMAC-SHA1 (expo-signature).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|statut|login|api/veille|api/idee-action|api/eas-webhook).*)",
  ],
};
