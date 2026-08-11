import Link from "next/link";
import { DeathClock } from "../components/home/death-clock";
import { CurrencyRecordCard } from "../components/home/currency-record-card";
import {
  UsdComparison,
  type ComparisonRow,
} from "../components/home/usd-comparison";
import {
  ChartFrame,
  MethodologyTooltip,
  MetricCard,
  MetricTrend,
  RiskBadge,
} from "../components/research";
import { verifiedCurrencySeed } from "../lib/data/verified-currency-seed";

const countryNames = new Map(
  verifiedCurrencySeed.countries.map((country) => [country.slug, country.name]),
);

function displayYear(date: { year: number }) {
  return String(date.year);
}

function displayLabel(value: string) {
  return value.replaceAll("_", " ");
}

const currencyCards = verifiedCurrencySeed.currencies.map((currency) => ({
  name: currency.name,
  slug: currency.slug,
  country: countryNames.get(currency.countrySlug) ?? currency.countrySlug,
  period: `${displayYear(currency.startDate)}—${displayYear(currency.endDate)}`,
  status: displayLabel(currency.status),
  cause: displayLabel(currency.primaryFailureCause),
  summary: currency.summary,
}));

const comparisonRows: readonly ComparisonRow[] = [
  {
    currency: "U.S. dollar / current system",
    period: "Research pending",
    evidence: "unavailable",
    event: "Comparable stress series not yet approved",
    outcome: "No outcome asserted",
    isDollar: true,
  },
  ...verifiedCurrencySeed.currencies.slice(0, 4).map((currency) => ({
    currency: currency.name,
    period: `${displayYear(currency.startDate)}—${displayYear(currency.endDate)}`,
    evidence: "sourced" as const,
    event: displayLabel(currency.primaryFailureCause),
    outcome: `${displayLabel(currency.status)} by ${currency.replacementCurrencyName}`,
  })),
];

export default function Home() {
  return (
    <main id="main-content" className="homepage">
      <section className="homepage-hero">
        <div className="shell-container homepage-hero__grid">
          <div className="homepage-hero__copy">
            <p className="section-kicker">Monetary history / purchasing power</p>
            <h1>
              No fiat currency
              <span>lasts forever.</span>
            </h1>
            <p className="homepage-hero__lede">
              Every monetary system leaves a record. Study what changed them.
              Track the warning signs without confusing a model for a prophecy.
            </p>
            <div className="homepage-hero__actions">
              <Link href="#past-deaths">Explore verified cases</Link>
              <Link href="#methodology-note">Read the model warning</Link>
            </div>
          </div>

          <DeathClock
            units={[
              { label: "Years", value: "08" },
              { label: "Months", value: "04" },
              { label: "Days", value: "17" },
              { label: "Hours", value: "13" },
            ]}
          />
        </div>
      </section>

      <section className="homepage-dashboard shell-container" aria-labelledby="dashboard-title">
        <div className="homepage-section-heading">
          <div>
            <p className="section-kicker">Instrument panel / development state</p>
            <h2 id="dashboard-title">Signals before conclusions</h2>
          </div>
          <p>Every visible state tells you whether a number is sourced, illustrative, stale, or unavailable.</p>
        </div>

        <div className="homepage-metric-grid">
          <MetricCard
            label="U.S. Dollar Stress Score"
            value="68"
            unit="of 100"
            state="fixture"
            detail="Illustrative composition only. No score or weights are approved for publication."
            accessory={<RiskBadge level="high" label="Illustrative high" />}
            footer={
              <MethodologyTooltip
                title="No hidden probability"
                description="A future score will normalize documented inputs using versioned weights. This fixture demonstrates presentation only."
                href="/methodology/dollar-stress-score"
              />
            }
          />

          <MetricCard
            label="Verified historical records"
            value={String(verifiedCurrencySeed.currencies.length)}
            unit="cases"
            state="sourced"
            detail="Small, source-vetted seed only. It is not a representative sample of all currencies."
            accessory={<MetricTrend direction="flat" value="v1" context="research seed" />}
          />

          <MetricCard
            label="Average fiat lifespan"
            value={null}
            state="unavailable"
            detail="Withheld until inclusion rules and a representative dataset are approved."
          />
        </div>

        <div className="homepage-research-grid" id="lifespan">
          <ChartFrame
            title="Lifespan distribution preview"
            description="An illustrative six-bin distribution rises toward the middle and then declines. These bars are a layout fixture and do not summarize the verified seed or all fiat currencies."
            state="fixture"
            legend={[
              { label: "Illustrative count", marker: "line", tone: "signal" },
              { label: "Publication withheld", marker: "dash" },
            ]}
          >
            <svg viewBox="0 0 640 220" role="img" aria-labelledby="lifespan-chart-title lifespan-chart-desc">
              <title id="lifespan-chart-title">Illustrative lifespan distribution</title>
              <desc id="lifespan-chart-desc">Six outlined bars rise to the third bin, then decline.</desc>
              <g className="homepage-chart-bars" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M30 190H610" opacity=".4" />
                <path d="M62 190V156H126V190M152 190V112H216V190M242 190V42H306V190M332 190V76H396V190M422 190V130H486V190M512 190V164H576V190" />
              </g>
            </svg>
          </ChartFrame>

          <aside className="survival-dossier" aria-labelledby="survival-title">
            <header>
              <div>
                <p>Database survival audit</p>
                <h3 id="survival-title">What the seed can say</h3>
              </div>
              <span className="metric-numerals">V1 / 05</span>
            </header>
            <dl>
              <div><dt>Historical records</dt><dd className="metric-numerals">05</dd></div>
              <div><dt>Collapse classifications</dt><dd className="metric-numerals">01</dd></div>
              <div><dt>Replacements</dt><dd className="metric-numerals">03</dd></div>
              <div><dt>Redenominations</dt><dd className="metric-numerals">01</dd></div>
              <div><dt>Universal survival claim</dt><dd>Withheld</dd></div>
            </dl>
            <p>
              A currency union transition is not a collapse. A redenomination is not automatically a death. Classification stays visible.
            </p>
          </aside>
        </div>
      </section>

      <section className="homepage-archive" id="past-deaths" aria-labelledby="archive-title">
        <div className="shell-container">
          <div className="homepage-section-heading">
            <div>
              <p className="section-kicker">Past deaths / transitions / replacements</p>
              <h2 id="archive-title">Five records. Sources first.</h2>
            </div>
            <Link href="/deaths">Full archive planned →</Link>
          </div>

          <div className="currency-record-grid">
            {currencyCards.map((currency) => (
              <CurrencyRecordCard key={currency.slug} {...currency} />
            ))}
          </div>
        </div>
      </section>

      <section className="homepage-comparison shell-container" id="compare" aria-labelledby="comparison-title">
        <div className="homepage-section-heading">
          <div>
            <p className="section-kicker">Context, not equivalence</p>
            <h2 id="comparison-title">How the U.S. dollar compares</h2>
          </div>
          <p>Similar-looking indicators do not prove identical causes or outcomes.</p>
        </div>
        <UsdComparison rows={comparisonRows} />
      </section>

      <section className="homepage-methodology" id="methodology-note">
        <div className="shell-container homepage-methodology__grid">
          <div>
            <p className="section-kicker">Experimental means challengeable</p>
            <h2>The model should invite scrutiny.</h2>
          </div>
          <p>
            A future stress score will expose every input, source, normalization range, weight, version, and update date. Until that contract is approved, the dramatic clock remains deliberately static.
          </p>
          <Link href="/methodology/dollar-stress-score">Review methodology placeholder →</Link>
        </div>
      </section>

      <section className="watchlist-teaser" id="watchlist" aria-labelledby="watchlist-title">
        <div className="shell-container watchlist-teaser__grid">
          <div>
            <p className="section-kicker">Research dispatches / planned</p>
            <h2 id="watchlist-title">Watch the evidence, not the spectacle.</h2>
          </div>
          <p>
            Email signup arrives in the approved watchlist issue. No address is collected by this static preview.
          </p>
          <span className="watchlist-teaser__status" aria-label="Watchlist signup is not yet available">
            Watchlist intake offline
          </span>
        </div>
      </section>
    </main>
  );
}
