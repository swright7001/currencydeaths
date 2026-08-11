import type { Metadata } from "next";
import Link from "next/link";
import { LifespanFilterForm } from "../../components/lifespan/lifespan-filter-form";
import {
  activeLifespanFilterCount,
  buildLifespanResearch,
  filterLifespanRecords,
  parseLifespanQuery,
  type LifespanResearchRecord,
} from "../../lib/data/lifespan-research";
import { VERIFIED_CURRENCY_SEED_VERSION } from "../../lib/data/verified-currency-seed";
import type { ArchiveSearchParams } from "../../lib/data/currency-archive";

export const metadata: Metadata = {
  title: "Currency Lifespan Research | CurrencyDeaths",
  description:
    "Explore transparent lifespan ranges derived from CurrencyDeaths' small, source-vetted historical currency sample.",
};

function rangeLabel(range: Readonly<{ minimumYears: number; maximumYears: number }> | null) {
  if (range === null) return "—";
  return range.minimumYears === range.maximumYears
    ? `${range.minimumYears} years`
    : `${range.minimumYears}–${range.maximumYears} years`;
}

function RecordList({ records }: Readonly<{ records: readonly LifespanResearchRecord[] }>) {
  return (
    <ol>
      {records.map((record) => (
        <li key={record.slug}>
          <Link href={`/deaths/${record.slug}`}>{record.name}</Link>
          <span>{rangeLabel(record.lifespan)}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function LifespanPage({
  searchParams,
}: Readonly<{ searchParams: Promise<ArchiveSearchParams> }>) {
  const query = parseLifespanQuery(await searchParams);
  const records = filterLifespanRecords(query);
  const research = buildLifespanResearch(records);
  const activeCount = activeLifespanFilterCount(query);
  const maximumBandCount = Math.max(1, ...research.distribution.map((band) => band.count));

  return (
    <main id="main-content" className="lifespan-page">
      <section className="lifespan-hero">
        <div className="shell-container lifespan-hero__grid">
          <div>
            <p className="section-kicker">Lifespan data / verified seed</p>
            <h1>Five records.<br /><em>Not a law of money.</em></h1>
          </div>
          <div className="lifespan-hero__readout">
            <span>Selected sample</span>
            <strong className="metric-numerals">{String(research.count).padStart(2, "0")}</strong>
            <p>Closed historical records with source-audited transition dates.</p>
          </div>
        </div>
      </section>

      <div className="shell-container lifespan-workspace">
        <LifespanFilterForm query={query} activeCount={activeCount} />

        {research.count === 0 ? (
          <section className="lifespan-empty" role="status">
            <p className="section-kicker">Zero eligible records</p>
            <h2>The filters exhaust this sample.</h2>
            <p>Clear a filter to restore records. Empty results remain empty; no values are imputed.</p>
            <Link href="/lifespan">Clear all filters →</Link>
          </section>
        ) : (
          <>
            <section className="lifespan-summary" aria-labelledby="lifespan-summary-title">
              <header>
                <p className="section-kicker">Selected-sample measures</p>
                <h2 id="lifespan-summary-title">Observed lifespan ranges</h2>
              </header>
              <dl>
                <div><dt>Records</dt><dd>{research.count}</dd></div>
                <div><dt>Average range</dt><dd>{rangeLabel(research.average)}</dd></div>
                <div><dt>Median range</dt><dd>{rangeLabel(research.median)}</dd></div>
                <div><dt>Observed span</dt><dd>{rangeLabel(research.span)}</dd></div>
              </dl>
            </section>

            <section className="lifespan-distribution" aria-labelledby="lifespan-distribution-title">
              <header>
                <div>
                  <p className="section-kicker">Distribution</p>
                  <h2 id="lifespan-distribution-title">Where the records land</h2>
                </div>
                <p>Counts are the accessible text equivalent of each bar.</p>
              </header>
              <ol aria-label="Lifespan distribution by band">
                {research.distribution.map((band) => (
                  <li key={band.key}>
                    <span>{band.label}</span>
                    <div aria-hidden="true"><i style={{ width: `${(band.count / maximumBandCount) * 100}%` }} /></div>
                    <strong>{band.count}</strong>
                  </li>
                ))}
                {research.crossBandCount > 0 ? (
                  <li><span>Crosses a band boundary</span><div aria-hidden="true"><i style={{ width: `${(research.crossBandCount / maximumBandCount) * 100}%` }} /></div><strong>{research.crossBandCount}</strong></li>
                ) : null}
              </ol>
            </section>

            <section className="lifespan-extremes" aria-labelledby="lifespan-extremes-title">
              <header>
                <p className="section-kicker">Selected records</p>
                <h2 id="lifespan-extremes-title">Shortest and longest</h2>
              </header>
              <div>
                <article><h3>Shortest observed</h3><RecordList records={research.shortest} /></article>
                <article><h3>Longest observed</h3><RecordList records={research.longest} /></article>
              </div>
            </section>

            <section className="lifespan-breakdowns" aria-labelledby="lifespan-breakdowns-title">
              <header>
                <p className="section-kicker">Composition</p>
                <h2 id="lifespan-breakdowns-title">What is inside the result</h2>
              </header>
              <div>
                {([
                  ["Transition century", research.byCentury],
                  ["Primary transition cause", research.byCause],
                  ["Region", research.byRegion],
                ] as const).map(([title, items]) => (
                  <article key={title}>
                    <h3>{title}</h3>
                    <dl>{items.map((item) => <div key={item.key}><dt>{item.label}</dt><dd>{item.count}</dd></div>)}</dl>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="lifespan-methodology" aria-labelledby="lifespan-methodology-title">
          <div>
            <p className="section-kicker">Methodology / {VERIFIED_CURRENCY_SEED_VERSION}</p>
            <h2 id="lifespan-methodology-title">Read the limits before the number.</h2>
          </div>
          <div className="lifespan-methodology__notes">
            <article><h3>Inclusion</h3><p>Only source-vetted records in the current seed with a start date, closed transition date, and calculable lifespan are included. Active currencies require an explicit as-of date and are excluded from this closed-record view.</p></article>
            <article><h3>Date precision</h3><p>Year- and month-level dates become honest lower and upper bounds. Aggregates calculate the lower and upper series separately; no hidden midpoint is substituted.</p></article>
            <article><h3>Rounding</h3><p>Completed-year bounds are aggregated and rounded to one decimal. A record enters a distribution band only when its entire range fits inside it.</p></article>
            <article><h3>Selection warning</h3><p>This is a curated five-case research seed, not a random or comprehensive currency census. Average and median describe only the selected result and must not be generalized to all fiat currencies.</p></article>
          </div>
        </section>
      </div>
    </main>
  );
}
