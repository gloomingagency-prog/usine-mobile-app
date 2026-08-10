import fs from "node:fs";
import path from "node:path";

// Les documents vivent en local dans le repo (directive utilisateur :
// jamais sur un service externe). Le cockpit les rend depuis ../docs.
const DOCS_ROOT = path.join(process.cwd(), "..", "docs");

export type DocEntry = { slug: string[]; title: string; dir: string };

function titleOf(filePath: string): string {
  try {
    const firstLines = fs.readFileSync(filePath, "utf8").split("\n").slice(0, 10);
    const h1 = firstLines.find((l) => l.startsWith("# "));
    if (h1) return h1.replace(/^#\s+/, "").trim();
  } catch {
    // titre par défaut ci-dessous
  }
  return path.basename(filePath, ".md");
}

export function listDocs(): DocEntry[] {
  if (!fs.existsSync(DOCS_ROOT)) return [];
  const entries: DocEntry[] = [];
  const walk = (dir: string, slug: string[]) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full, [...slug, name]);
      else if (name.endsWith(".md")) {
        entries.push({
          slug: [...slug, name.replace(/\.md$/, "")],
          title: titleOf(full),
          dir: slug.join("/") || ".",
        });
      }
    }
  };
  walk(DOCS_ROOT, []);
  return entries;
}

export function readDoc(slug: string[]): string | null {
  // Anti-traversée : le chemin résolu doit rester sous DOCS_ROOT.
  const full = path.join(DOCS_ROOT, ...slug) + ".md";
  const resolved = path.resolve(full);
  if (!resolved.startsWith(path.resolve(DOCS_ROOT) + path.sep)) return null;
  if (!fs.existsSync(resolved)) return null;
  return fs.readFileSync(resolved, "utf8");
}
