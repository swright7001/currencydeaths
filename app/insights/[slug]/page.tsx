import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceCitation } from "../../../components/research";
import {
  createInsightStructuredData,
  getInsightArticle,
  getInsightSources,
  insightSlugs,
} from "../../../lib/data/insights";

type InsightPageProps = Readonly<{ params: Promise<{ slug: string }> }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return insightSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: InsightPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getInsightArticle(slug);
  if (article === undefined) return { title: "Insight not found | CurrencyDeaths", robots: { index: false, follow: false } };
  const title = `${article.title} | CurrencyDeaths`;
  const url = `/insights/${article.slug}`;
  return {
    title,
    description: article.dek,
    alternates: { canonical: url },
    openGraph: { title, description: article.dek, type: "article", url, publishedTime: article.publishedDate, modifiedTime: article.reviewedDate },
    twitter: { card: "summary_large_image", title, description: article.dek },
  };
}

export default async function InsightArticlePage({ params }: InsightPageProps) {
  const { slug } = await params;
  const article = getInsightArticle(slug);
  if (article === undefined) notFound();

  return (
    <main id="main-content" className="insight-article-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(createInsightStructuredData(article)) }} />
      <header className="insight-article-hero">
        <div className="shell-container">
          <Link href="/insights">← Return to insights</Link>
          <p className="section-kicker">{article.category} / reviewed research note</p>
          <h1>{article.title}</h1>
          <p>{article.dek}</p>
          <dl>
            <div><dt>Published</dt><dd>{article.publishedDate}</dd></div>
            <div><dt>Reviewed</dt><dd>{article.reviewedDate}</dd></div>
            <div><dt>Reading time</dt><dd>{article.readingMinutes} minutes</dd></div>
          </dl>
        </div>
      </header>

      <div className="shell-container insight-article-layout">
        <nav aria-label="Article contents">
          <p>Contents</p>
          <ol>{article.sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}>{String(index + 1).padStart(2, "0")} / {section.heading}</a></li>)}</ol>
        </nav>
        <article className="insight-prose">
          {article.sections.map((section) => (
            <section id={section.id} key={section.id} data-kind={section.label === "Sourced fact" ? "fact" : "interpretation"}>
              <span>{section.label}</span>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.sourceKeys?.map((key, index) => {
                const source = getInsightSources([key])[0];
                return <SourceCitation key={key} source={source} claim={`Citation ${index + 1} for this sourced-fact section.`} ariaLabel={`Source for ${section.heading}`} />;
              })}
            </section>
          ))}
        </article>
      </div>

      <section className="insight-related" aria-labelledby="related-methodologies-title">
        <div className="shell-container">
          <p className="section-kicker">Related methodologies</p>
          <h2 id="related-methodologies-title">Follow the rules behind the claim.</h2>
          <div>{article.relatedMethodologies.map((item) => <article key={item.href}><h3><Link href={item.href}>{item.title} →</Link></h3><p>{item.note}</p></article>)}</div>
        </div>
      </section>
    </main>
  );
}
