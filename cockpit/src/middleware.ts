import { NextRequest, NextResponse } from "next/server";

// Le cockpit prend des décisions : jamais exposé sans authentification.
// Basic Auth simple pour le maillon 1 ; remplacé par une vraie session
// (Auth.js) quand le multi-utilisateurs arrivera.
export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) {
    // Fail-closed : sans identifiants configurés, on n'expose rien.
    return new NextResponse("Cockpit non configuré (ADMIN_USER/ADMIN_PASSWORD).", {
      status: 503,
    });
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    const u = decoded.slice(0, idx);
    const p = decoded.slice(idx + 1);
    if (u === user && p === password) return NextResponse.next();
  }

  return new NextResponse("Authentification requise.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Usine Cockpit", charset="UTF-8"' },
  });
}

export const config = {
  // Tout est protégé sauf les assets Next, le favicon et la page de
  // statut publique (lecture seule, zéro donnée sensible — consultable
  // du téléphone sans se connecter).
  // /api/veille est hors Basic Auth : protégé par CRON_SECRET (Bearer).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|statut|api/veille).*)"],
};
