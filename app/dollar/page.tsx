import type { Metadata } from "next";
import Link from "next/link";
import { MetricSeriesChart } from "../../components/dollar/metric-series-chart";
import { MetricCard } from "../../components/metrics/metric-card";
import { MetricTrend } from "../../components/metrics/metric-trend";
import { SourceCitation } from "../../components/research/source-citation";
import {
  buildFixtureDollarDashboard,
  formatHistoricalMonth,
  formatUtcDate,
} from "../../lib/data/dollar-dashboard";

export const metadata: Metadata = {
  title: "U.S. Dollar Research Dashboard",
  description:
    "Inspect source-attributed development fixtures for M2, CPI, federal debt-to-GDP, and the experimental Dollar Stress Score methodology.",
  alternates: { canonical: "/dollar" },
};

export default function DollarDashboardPage() {
  const dashboard = buildFixtureDollarDashboard();

  return (
    <main id="main-content" className="dollar-page">
      <section className="dollar-hero">
        <div className="shell-container dollar-hero__grid">
          <div>
            <p className="section-kicker">U.S. dollar / evidence monitor</p>
            <h1>Pressure, with provenance.</h1>
            <p>
              Three approved FRED series, shown as development fixtures—not live
              readings, trading signals, or a forecast of monetary failure.
            </p>
          </div>
          <aside aria-label="Dashboard data release">
            <span>Development data only</span>
            <dl>
              <div><dt>Fixture version</dt><dd>{dashboard.fixtureVersion}</dd></div>
              <div><dt>Freshness evaluated</dt><dd>{formatUtcDate(dashboard.freshnessAsOf)}</dd></div>
              <div><dt>Approved series</dt><dd>{dashboard.metrics.length}</dd></div>
              <div><dt>Live ingestion</dt><dd>Offline</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="shell-container dollar-stress-panel" aria-labelledby="dollar-stress-title">
        <div className="dollar-stress-panel__reading">
          <p className="section-kicker">Experimental stress model</p>
          <h2 id="dollar-stress-title">Score withheld</h2>
          <p>
            The fixture cannot satisfy every required input at approved precision.
            Missing data is not converted to zero and no partial total is published.
          </p>
          <Link href="/methodology/dollar-stress-score">
            Review {dashboard.stress.methodologyVersion} →
          </Link>
        </div>
        <ol className="dollar-stress-components">
          {dashboard.stress.missingComponents.map((component, index) => (
            <li key={component.id}>
              <span className="metric-numerals">{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{component.label}</strong><p>{component.reason}</p></div>
              <dl><dt>Weight</dt><dd>{component.weight * 100}%</dd><dt>Points</dt><dd>—</dd></dl>
            </li>
          ))}
        </ol>
      </section>

      <section className="shell-container dollar-metrics" aria-labelledby="dollar-metrics-title">
        <header className="dollar-section-heading">
          <div>
            <p className="section-kicker">Current fixture readings / source adjacent</p>
            <h2 id="dollar-metrics-title">Three signals. No hidden inputs.</h2>
          </div>
          <p>Direction compares only the two latest stored observations within each series.</p>
        </header>

        <div className="dollar-metric-grid">
          {dashboard.metrics.map((metric) => (
            <div className="dollar-metric-stack" key={metric.key}>
              <MetricCard
                label={metric.label}
                value={metric.displayValue}
                unit={metric.unitLabel}
                state="fixture"
                detail={`Observation ${formatHistoricalMonth(metric.latest.observationDate)} · source updated ${formatUtcDate(metric.latest.sourceUpdatedAt)} · freshness at fixture access: ${metric.freshness.state} (${metric.freshness.ageDays}/${metric.freshness.thresholdDays}-day window).`}
                accessory={<MetricTrend direction={metric.trend} value={metric.trendValue} context={metric.trendContext} tone="neutral" />}
              />
              <SourceCitation
                state="fixture"
                ariaLabel={`${metric.label} source citation`}
                claim={`${metric.observations.length} stored ${metric.latest.frequency} observations. Values may be revised; consult the source.`}
                source={{
                  title: `${metric.source.title} · ${metric.latest.sourceSeriesId}`,
                  publisher: metric.source.publisher,
                  url: metric.source.url,
                  accessedDate: formatUtcDate(metric.source.accessedAt),
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="dollar-history" aria-labelledby="dollar-history-title">
        <div className="shell-container">
          <header className="dollar-section-heading">
            <div>
              <p className="section-kicker">Short windows / explicit limitation</p>
              <h2 id="dollar-history-title">Recent fixture history</h2>
            </div>
            <p>These five-point traces demonstrate the interface; they are not long-run evidence.</p>
          </header>
          <div className="dollar-chart-grid">
            {dashboard.metrics.map((metric) => <MetricSeriesChart key={metric.key} metric={metric} />)}
          </div>
        </div>
      </section>

      <section className="shell-container dollar-limitations" aria-labelledby="dollar-limits-title">
        <div><p className="section-kicker">Interpretation boundary</p><h2 id="dollar-limits-title">Read the gaps first.</h2></div>
        <ul>
          <li>Fixture values are static and may differ from revised source releases.</li>
          <li>Series have different units and frequencies; visual proximity does not make them directly comparable.</li>
          <li>No result here predicts dollar failure, investment returns, or policy outcomes.</li>
        </ul>
      </section>
    </main>
  );
}
