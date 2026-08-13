import type { Metadata } from "next";
import { InsightCard } from "../../components/insights/insight-card";
import { insightArticles } from "../../lib/data/insights";

export const metadata: Metadata = {
  title: "Monetary History Insights",
  description: "Sourced research notes that separate monetary-history evidence from interpretation.",
  alternates: { canonical: "/insights" },
};

export default function InsightsPage() {
  return (
    <main id="main-content" className="insights-page">
      <section className="insights-hero">
        <div className="shell-container insights-hero__grid">
          <div>
            <p className="section-kicker">Insights / editorial research</p>
            <h1>History,<br /><em>with receipts.</em></h1>
          </div>
          <p>Evidence and interpretation belong in the same conversation—but never in the same unlabeled box.</p>
        </div>
      </section>
      <section className="shell-container insights-index" aria-labelledby="insights-index-title">
        <header>
          <div>
            <p className="section-kicker">Reviewed notes</p>
            <h2 id="insights-index-title">The research desk</h2>
          </div>
          <p>{insightArticles.length} published / claim-level citations required</p>
        </header>
        <div className="insights-grid">
          {insightArticles.map((article) => <InsightCard key={article.slug} article={article} />)}
        </div>
      </section>
    </main>
  );
}
