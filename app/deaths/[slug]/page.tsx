import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceLedger } from "../../../components/currency/evidence-ledger";
import { CurrencyTimeline } from "../../../components/currency/currency-timeline";
import { UnavailableResearchGrid } from "../../../components/currency/unavailable-research-grid";
import { DataStateBadge } from "../../../components/research";
import {
  createCurrencyDetailStructuredData,
  currencyDetailSlugs,
  formatHistoricalDate,
  getCurrencyDetailFromDataset,
} from "../../../lib/data/currency-detail";
import { loadResearchCurrency } from "../../../lib/data/research-repository";
import { serializeJsonLd } from "../../../lib/json-ld";

type CurrencyDetailPageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export const dynamicParams = false;

function displayLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatLifespan(minimum: number, maximum: number) {
  return minimum === maximum ? `${minimum} years` : `${minimum}–${maximum} years`;
}

export function generateStaticParams() {
  return currencyDetailSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: CurrencyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadResearchCurrency(slug);
  if (loaded === null) {
    return {
      title: "Currency record not found",
      robots: { index: false, follow: false },
    };
  }
  const detail = getCurrencyDetailFromDataset(loaded.dataset, slug);
  if (detail === undefined) throw new Error("Loaded research record is missing.");

  const title = `${detail.name}: What Happened and Why`;
  const canonicalPath = `/deaths/${detail.slug}`;
  return {
    title,
    description: detail.summary,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description: detail.summary,
      type: "article",
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: detail.summary,
    },
  };
}

export default async function CurrencyDetailPage({ params }: CurrencyDetailPageProps) {
  const { slug } = await params;
  const loaded = await loadResearchCurrency(slug);
  if (loaded === null) notFound();
  const detail = getCurrencyDetailFromDataset(loaded.dataset, slug);
  if (detail === undefined) throw new Error("Loaded research record is missing.");

  const structuredData = createCurrencyDetailStructuredData(detail);

  return (
    <main id="main-content" className="currency-detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />

      <section className="currency-detail-hero">
        <div className="shell-container">
          <Link className="currency-detail-back" href="/deaths">
            ← Return to archive
          </Link>
          <div className="currency-detail-hero__grid">
            <div>
              <p className="section-kicker" data-research-source={loaded.source}>
                {detail.countryName} / {loaded.sourceLabel}
              </p>
              <h1>{detail.name}</h1>
              <p>{detail.summary}</p>
            </div>
            <aside aria-label="Currency record status">
              <DataStateBadge state="sourced" label="Verified seed" />
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>{displayLabel(detail.status)}</dd>
                </div>
                <div>
                  <dt>Primary documented cause</dt>
                  <dd>{displayLabel(detail.primaryFailureCause)}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </section>

      <section className="shell-container currency-detail-instruments" aria-label="Recorded currency facts">
        <article>
          <span>Recorded start</span>
          <strong className="metric-numerals">{formatHistoricalDate(detail.startDate)}</strong>
          <small>{detail.startDate.precision} precision</small>
        </article>
        <article>
          <span>Recorded end</span>
          <strong className="metric-numerals">{formatHistoricalDate(detail.endDate)}</strong>
          <small>{detail.endDate.precision} precision</small>
        </article>
        <article>
          <span>Derived lifespan</span>
          <strong className="metric-numerals">
            {formatLifespan(detail.lifespan.minimumYears, detail.lifespan.maximumYears)}
          </strong>
          <small>range preserves date precision</small>
        </article>
        <article>
          <span>Currency symbol</span>
          {detail.symbol !== undefined ? (
            <strong>{detail.symbol}</strong>
          ) : (
            <DataStateBadge state="unavailable" />
          )}
          <small>
            {detail.symbol !== undefined
              ? "recorded in verified seed"
              : "no symbol inferred"}
          </small>
        </article>
      </section>

      <section className="shell-container currency-detail-section" aria-labelledby="timeline-title">
        <header className="currency-detail-section__heading">
          <div>
            <p className="section-kicker">Dated evidence / precision preserved</p>
            <h2 id="timeline-title">Historical timeline</h2>
          </div>
          <p>Only claims with a supported start or transition date appear here.</p>
        </header>
        <CurrencyTimeline events={detail.timeline} />
      </section>

      <section className="currency-detail-context" aria-labelledby="context-title">
        <div className="shell-container currency-detail-context__grid">
          <div>
            <p className="section-kicker">Documented context</p>
            <h2 id="context-title">What the record supports</h2>
          </div>
          <article>
            <DataStateBadge state="sourced" label="Seed narrative" />
            <p>{detail.historicalContext}</p>
          </article>
          <article>
            <DataStateBadge state="sourced" label="Cause claim" />
            <p>{detail.causeClaim.statement}</p>
          </article>
          <article>
            <DataStateBadge state="sourced" label="Recorded successor" />
            <h3>{detail.replacementCurrencyName}</h3>
            <p>
              Successor naming records what followed; it does not by itself prove
              that the successor caused the prior outcome.
            </p>
          </article>
        </div>
      </section>

      <section className="shell-container currency-detail-section" aria-labelledby="gaps-title">
        <header className="currency-detail-section__heading">
          <div>
            <p className="section-kicker">Research gaps / no fabrication</p>
            <h2 id="gaps-title">Evidence not yet in the seed</h2>
          </div>
          <p>Unavailable does not mean zero. It means this release has no approved claim.</p>
        </header>
        <UnavailableResearchGrid />
      </section>

      <section className="currency-detail-claims" aria-labelledby="claims-title">
        <div className="shell-container">
          <header className="currency-detail-section__heading">
            <div>
              <p className="section-kicker">Claim-level provenance</p>
              <h2 id="claims-title">Evidence ledger</h2>
            </div>
            <p>Each factual claim names its supporting source and any recorded ambiguity.</p>
          </header>
          <EvidenceLedger claims={detail.claims} />
        </div>
      </section>

      <section className="shell-container currency-detail-methodology" aria-labelledby="detail-methodology-title">
        <div>
          <p className="section-kicker">Methodology boundary</p>
          <h2 id="detail-methodology-title">Classification is not prediction.</h2>
        </div>
        <p>
          This page summarizes a versioned verified seed. Dates retain their source
          precision, lifespan is derived as a range, missing evidence stays unavailable,
          and similar historical labels do not imply identical causes or outcomes.
        </p>
        <Link href="/methodology/dollar-stress-score">Review stress-score methodology →</Link>
      </section>
    </main>
  );
}
