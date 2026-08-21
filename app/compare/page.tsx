import type { Metadata } from "next";
import Link from "next/link";
import { CurrencyCompareSelector } from "../../components/compare/currency-compare-selector";
import { DataStateBadge } from "../../components/research";
import {
  buildCurrencyComparison,
  createComparisonCurrencyOptions,
  resolveComparisonSelection,
  type ComparisonMode,
  type ComparisonSide,
} from "../../lib/data/currency-comparison";
import { loadResearchCollection } from "../../lib/data/research-repository";

export const metadata: Metadata = {
  title: "Compare the U.S. Dollar to Currency History",
  description:
    "Compare sourced U.S. dollar development fixtures with one verified historical currency case without implying identical outcomes.",
  alternates: { canonical: "/compare" },
};

type ComparePageProps = Readonly<{
  searchParams?: Promise<{ currency?: string | string[] }>;
}>;

const modeLabels: Record<ComparisonMode, string> = {
  direct: "Direct",
  contextual: "Context only",
  unavailable: "Not comparable",
};

function ComparisonValue({ side, label }: Readonly<{ side: ComparisonSide; label: string }>) {
  return (
    <div className="compare-value">
      <p className="compare-value__eyebrow">{label}</p>
      {side.value === null ? (
        <div className="compare-value__unavailable">
          <DataStateBadge state="unavailable" />
          <p>{side.unavailableReason}</p>
        </div>
      ) : (
        <strong>{side.value}</strong>
      )}
      <dl>
        <div><dt>Unit</dt><dd>{side.unit}</dd></div>
        <div><dt>Window</dt><dd>{side.timeWindow}</dd></div>
        <div>
          <dt>Source</dt>
          <dd>
            {side.sources.length === 0 ? (
              "No factual source asserted"
            ) : (
              <span className="compare-source-list">
                {side.sources.map((source) => (
                  <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                    {source.publisher} ↗
                  </a>
                ))}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default async function ComparePage({ searchParams = Promise.resolve({}) }: ComparePageProps) {
  const loaded = await loadResearchCollection();
  const options = createComparisonCurrencyOptions(loaded.dataset);
  const query = await searchParams;
  const selection = resolveComparisonSelection(query.currency, options);
  const comparison = buildCurrencyComparison(selection.slug, loaded.dataset);

  return (
    <main id="main-content" className="compare-page">
      <section className="compare-hero">
        <div className="shell-container compare-hero__grid">
          <div>
            <p className="section-kicker">Comparative monetary history / evidence first</p>
            <h1>Same pressure?<br /><span>Different system.</span></h1>
            <p>
              Put one verified historical case beside the U.S. dollar. Every row
              declares what can—and cannot—be compared.
            </p>
          </div>
          <div className="compare-hero__versus" role="img" aria-label={`U.S. dollar compared with ${comparison.historical.name}`}>
            <span>USD</span><b>VS</b><span>{comparison.historical.countryName.slice(0, 3).toUpperCase()}</span>
          </div>
        </div>
      </section>

      <section className="shell-container compare-controls" aria-labelledby="compare-controls-title">
        <div>
          <p className="section-kicker">One case / shareable URL</p>
          <h2 id="compare-controls-title">Choose the historical record</h2>
          <p>The query parameter in the resulting URL preserves the selected case.</p>
        </div>
        <CurrencyCompareSelector selectedSlug={selection.slug} options={options} />
        {selection.state === "invalid" ? (
          <p className="compare-query-warning" role="status">
            That currency is not in the verified comparison set. The default case is shown.
          </p>
        ) : null}
      </section>

      <aside className="shell-container compare-warning" aria-label="Comparison interpretation warning">
        <span aria-hidden="true">!</span>
        <div>
          <strong>Similarity is not destiny.</strong>
          <p>
            Similar-looking metrics do not imply the same causes, sequence, political
            setting, reserve role, or final outcome. This page publishes no similarity
            score, collapse probability, or forecast.
          </p>
        </div>
      </aside>

      <section className="shell-container compare-ledger" aria-labelledby="compare-ledger-title">
        <header>
          <div>
            <p className="section-kicker" data-research-source={loaded.source}>Evidence ledger / {comparison.fixtureVersion} / {loaded.sourceLabel}</p>
            <h2 id="compare-ledger-title">USD vs {comparison.historical.name}</h2>
          </div>
          <dl aria-label="Comparability summary">
            <div><dt>Direct</dt><dd>{comparison.counts.direct}</dd></div>
            <div><dt>Context</dt><dd>{comparison.counts.contextual}</dd></div>
            <div><dt>Unavailable</dt><dd>{comparison.counts.unavailable}</dd></div>
          </dl>
        </header>

        <div className="compare-legend" role="group" aria-label="Comparability labels">
          <span><i data-mode="direct" /> Direct means matching definitions, units, and windows.</span>
          <span><i data-mode="contextual" /> Context only means evidence differs in definition, unit, or window.</span>
          <span><i data-mode="unavailable" /> Not comparable means an approved input is absent.</span>
        </div>

        <ol className="compare-row-list">
          {comparison.rows.map((row, index) => (
            <li className="compare-row" key={row.key}>
              <header>
                <span className="metric-numerals">{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{row.label}</h3><p>{row.interpretation}</p></div>
                <span className={`compare-mode compare-mode--${row.mode}`}>{modeLabels[row.mode]}</span>
              </header>
              <div className="compare-row__values">
                <ComparisonValue side={row.usd} label="U.S. dollar" />
                <ComparisonValue side={row.historical} label={comparison.historical.name} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="compare-resolution">
        <div className="shell-container">
          <div><p className="section-kicker">Read the full record</p><h2>Context survives the table.</h2></div>
          <p>
            The historical detail page preserves date precision, source ambiguity,
            transition evidence, and the limits of the current seed.
          </p>
          <Link href={`/deaths/${comparison.historical.slug}`}>Open {comparison.historical.name} research →</Link>
        </div>
      </section>
    </main>
  );
}
