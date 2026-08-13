import Link from "next/link";
import { DeathClock } from "../components/home/death-clock";
import { EmailSignup } from "../components/home/email-signup";
import { CurrencyRecordCard } from "../components/home/currency-record-card";
import {
  UsdComparison,
} from "../components/home/usd-comparison";
import {
  ChartFrame,
  MethodologyTooltip,
  MetricCard,
  MetricTrend,
} from "../components/research";
import {
  buildHomepageDashboard,
  type HomepageDeliveryState,
} from "../lib/data/homepage-dashboard";

export function Homepage({
  deliveryState = "ready",
}: Readonly<{ deliveryState?: HomepageDeliveryState }>) {
  const dashboard = buildHomepageDashboard(deliveryState);
  const maximumBandCount = Math.max(
    1,
    ...dashboard.lifespan.distribution.map((band) => band.count),
    dashboard.lifespan.crossBandCount,
  );

  return (
    <main id="main-content" className="homepage">
      <section className="homepage-hero">
        <div className="shell-container homepage-hero__grid">
          <div className="homepage-hero__copy">
            <p className="section-kicker">Editorial thesis / interpretation</p>
            <h1>
              No fiat currency
              <span>lasts forever.</span>
            </h1>
            <p className="homepage-hero__lede">
              This headline is an editorial thesis, not a universal empirical
              finding. Study monetary history and track warning signs without
              confusing a model for a prophecy.
            </p>
            <div className="homepage-hero__actions">
              <Link href="#past-deaths">Explore verified cases</Link>
              <Link href="#methodology-note">Read the model warning</Link>
            </div>
          </div>

          <DeathClock
            units={dashboard.clock.units}
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

        {dashboard.deliveryNotice ? (
          <aside className="homepage-data-notice" role={dashboard.deliveryNotice.role}>
            <strong>{dashboard.deliveryNotice.title}</strong>
            <p>{dashboard.deliveryNotice.detail}</p>
          </aside>
        ) : null}

        <div className="homepage-metric-grid">
          <MetricCard
            label="U.S. Dollar Stress Score"
            value={dashboard.stress.value}
            state={dashboard.stress.state}
            detail={dashboard.stress.detail}
            footer={
              <MethodologyTooltip
                title={`Methodology ${dashboard.stress.methodologyVersion}`}
                description="A score is withheld until every required source input satisfies the versioned methodology."
                href={dashboard.stress.sourceHref}
              />
            }
          />

          <MetricCard
            label="Verified historical records"
            value={String(dashboard.lifespan.recordCount)}
            unit="cases"
            state={dashboard.lifespan.state}
            detail={dashboard.lifespan.disclosure}
            accessory={<MetricTrend direction="flat" value={dashboard.lifespan.fixtureVersion} context="research seed" />}
            footer={<Link href={dashboard.lifespan.sourceHref}>Inspect lifespan data →</Link>}
          />

          <MetricCard
            label="Selected-sample average lifespan"
            value={dashboard.lifespan.average}
            state={dashboard.lifespan.state}
            detail={`Median ${dashboard.lifespan.median}. ${dashboard.lifespan.disclosure}`}
            footer={<Link href={dashboard.lifespan.sourceHref}>Method and source set →</Link>}
          />
        </div>

        <div className="homepage-research-grid" id="lifespan">
          <ChartFrame
            title="Selected-sample lifespan distribution"
            description={`Counts by completed-year range for ${dashboard.lifespan.recordCount} verified records. ${dashboard.lifespan.crossBandCount} record(s) cross a band boundary and are kept separate. This sample is not representative of all fiat currencies.`}
            state={dashboard.lifespan.state}
            legend={[
              { label: "Verified record count", marker: "line", tone: "signal" },
              { label: "Cross-band uncertainty separate", marker: "dash" },
            ]}
          >
            <ol className="homepage-lifespan-bars" aria-label="Selected-sample lifespan distribution">
              {dashboard.lifespan.distribution.map((band) => (
                <li key={band.key}>
                  <span>{band.label}</span>
                  <div aria-hidden="true"><i style={{ height: `${Math.max(4, (band.count / maximumBandCount) * 100)}%` }} /></div>
                  <strong className="metric-numerals">{band.count}</strong>
                </li>
              ))}
              <li>
                <span>Cross-band</span>
                <div aria-hidden="true"><i style={{ height: `${Math.max(4, (dashboard.lifespan.crossBandCount / maximumBandCount) * 100)}%` }} /></div>
                <strong className="metric-numerals">{dashboard.lifespan.crossBandCount}</strong>
              </li>
            </ol>
          </ChartFrame>

          <aside className="survival-dossier" aria-labelledby="survival-title">
            <header>
              <div>
                <p>Database survival audit</p>
                <h3 id="survival-title">What the seed can say</h3>
              </div>
              <span className="metric-numerals">{dashboard.lifespan.fixtureVersion} / {String(dashboard.survival.total).padStart(2, "0")}</span>
            </header>
            <dl>
              <div><dt>Historical records</dt><dd className="metric-numerals">{String(dashboard.survival.total).padStart(2, "0")}</dd></div>
              {dashboard.survival.counts.map((item) => (
                <div key={item.label}><dt>{item.label}</dt><dd className="metric-numerals">{String(item.value).padStart(2, "0")}</dd></div>
              ))}
              <div><dt>Universal survival claim</dt><dd>Withheld</dd></div>
            </dl>
            <p>
              A currency union transition is not a collapse. A redenomination is not automatically a death. <Link href={dashboard.survival.sourceHref}>Inspect the classified archive →</Link>
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
            <Link href="/deaths">Explore full archive →</Link>
          </div>

          <div className="currency-record-grid">
            {dashboard.currencyCards.map((currency) => (
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
        <UsdComparison rows={dashboard.comparisonRows} />
        <p className="homepage-provenance">
          Dollar inputs: development fixture {dashboard.provenance.dollarFixtureVersion}, accessed {dashboard.provenance.dollarAsOf}. Historical records: {dashboard.provenance.currencySeedVersion}. <Link href="/dollar">Inspect dollar sources →</Link>
        </p>
      </section>

      <section className="homepage-methodology" id="methodology-note">
        <div className="shell-container homepage-methodology__grid">
          <div>
            <p className="section-kicker">Experimental means challengeable</p>
            <h2>The model should invite scrutiny.</h2>
          </div>
          <p>
            The initial experimental methodology exposes three inputs, their sources,
            normalization ranges, weights, version, and missing-data policy. It remains
            unapproved for production labeling, and the dramatic clock stays static.
          </p>
          <Link href="/methodology/dollar-stress-score">Review experimental methodology →</Link>
        </div>
      </section>

      <section className="watchlist-teaser" id="watchlist" aria-labelledby="watchlist-title">
        <div className="shell-container watchlist-teaser__grid">
          <div>
            <p className="section-kicker">Research dispatches / double opt-in</p>
            <h2 id="watchlist-title">Watch the evidence, not the spectacle.</h2>
          </div>
          <p>Join for sourced research notes and product updates. This is not an automated financial-alert service.</p>
          <EmailSignup />
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  return <Homepage />;
}
