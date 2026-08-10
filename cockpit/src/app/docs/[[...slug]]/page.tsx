import { notFound } from "next/navigation";
import Link from "next/link";
import { marked } from "marked";
import { listDocs, readDoc } from "@/lib/docs";

export const dynamic = "force-dynamic";

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    const docs = listDocs();
    return (
      <>
        <p className="eyebrow">Documentation</p>
        <h1>Docs</h1>
        <p className="meta">
          Les documents du repo (<code>docs/</code>), rendus ici — jamais publiés à
          l&apos;extérieur.
        </p>
        {docs.length === 0 && <p className="empty">Aucun document trouvé.</p>}
        <ul className="doclist">
          {docs.map((d) => (
            <li key={d.slug.join("/")}>
              <Link href={`/docs/${d.slug.join("/")}`}>
                <span className="card">
                  <b>{d.title}</b>
                  <span>
                    {d.dir}/{d.slug[d.slug.length - 1]}.md
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const raw = readDoc(slug);
  if (raw === null) notFound();
  const html = await marked.parse(raw);

  return (
    <>
      <p className="meta">
        <Link href="/docs">← Tous les documents</Link>
      </p>
      <article className="doc" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
