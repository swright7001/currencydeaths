import Link from "next/link";
import type { InsightArticle } from "../../lib/data/insights";

export function InsightCard({ article }: Readonly<{ article: InsightArticle }>) {
  return (
    <article className="insight-card">
      <header>
        <span>{article.category}</span>
        <span>{article.readingMinutes} min read</span>
      </header>
      <h2><Link href={`/insights/${article.slug}`}>{article.title}</Link></h2>
      <p>{article.dek}</p>
      <footer>
        <span>Development draft / updated {article.updatedDate}</span>
        <Link href={`/insights/${article.slug}`}>Read research note →</Link>
      </footer>
    </article>
  );
}
