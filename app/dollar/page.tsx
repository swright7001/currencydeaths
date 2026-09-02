import type { Metadata } from "next";
import Link from "next/link";
import { MetricSeriesChart } from "../../components/dollar/metric-series-chart";
import { MetricCard } from "../../components/metrics/metric-card";
import { MetricTrend } from "../../components/metrics/metric-trend";
import { SourceCitation } from "../../components/research/source-citation";
import {
  formatHistoricalMonth,
  formatUtcDate,
} from "../../lib/data/dollar-dashboard";
import { loadDollarDashboard } from "../../lib/data/dollar-dashboard-repository";

export const metadata: Metadata = {
  title: "U.S. Dollar Research Dashboard",
  description:
    "Inspect source-verified dated snapshots for M2, CPI, federal debt-to-GDP, and the experimental Dollar Stress Score methodology.",
  alternates: { canonical: "/dollar" },
};

function formatStressObservation(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatStressSourceValue(value: number, unit: string) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 5 })} ${unit}`;
}

export default async function DollarDashboardPage() {
  const dashboard = await loadDollarDashboard();
  const providerBacked = dashboard.freshnessBasis === "provider_retrieval";

  return (
    <main id="main-content" className="dollar-page">
      <section className="dollar-hero">
        <div className="shell-container dollar-hero__grid">
          <div>
            <p className="section-kicker">U.S. dollar / evidence monitor</p>
            <h1>Pressure, with provenance.</h1>
            <p>
              Three approved FRED series, shown as verified dated snapshots—not live
              readings, trading signals, or a forecast of monetary failure.
            </p>
          </div>
          <aside aria-label="Dashboard data release">
            <span>{providerBacked ? "Official refresh batch" : "Verified snapshot"}</span>
            <dl>
              <div><dt>Current snapshot</dt><dd>{dashboard.datasetVersion}</dd></div>
              <div><dt>Stress baseline</dt><dd>{dashboard.stress.baselineVersion}</dd></div>
              <div><dt>Freshness evaluated</dt><dd>{formatUtcDate(dashboard.freshnessAsOf)}</dd></div>
              <div><dt>Retrieved</dt><dd>{formatUtcDate(dashboard.retrievedAt)}</dd></div>
              <div><dt>Approved series</dt><dd>{dashboard.metrics.length}</dd></div>
              <div><dt>Refresh pipeline</dt><dd>{providerBacked ? "Scheduled" : "Repository snapshot"}</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="shell-container dollar-stress-panel" aria-labelledby="dollar-stress-title">
        <div className="dollar-stress-panel__reading">
          <p className="section-kicker">Experimental stress model</p>
          <h2 id="dollar-stress-title">
            {dashboard.stress.score === null ? "Score withheld" : `${dashboard.stress.score} / 100`}
          </h2>
          <p>
            {dashboard.stress.score === null
              ? "A required input failed the approved freshness or validation contract. Missing data is never converted to zero."
              : `${dashboard.stress.band} selected stress. This equal-weight experimental index describes three sourced signals; it is not a probability or forecast.`}
          </p>
          <Link href="/methodology/dollar-stress-score">
            Audit {dashboard.stress.methodologyVersion} →
          </Link>
          {dashboard.stress.sensitivity.length > 0 ? (
            <div className="dollar-stress-sensitivity">
              <h3>Weight sensitivity</h3>
              <p>Illustrative alternatives; only equal thirds are approved.</p>
              <dl>
                {dashboard.stress.sensitivity.map((scenario) => (
                  <div key={scenario.id}>
                    <dt>{scenario.label}</dt>
                    <dd className="metric-numerals">{scenario.score}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
        <ol className="dollar-stress-components">
          {dashboard.stress.contributions.map((component, index) => (
            <li key={component.id}>
              <span className="metric-numerals">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{component.label}</strong>
                <p>
                  {component.inputLabel}: {component.rawValue.toFixed(2)} · {formatStressObservation(component.observationDate)} · {component.freshness}.
                  {component.saturated ? " Clipped at the approved p95 ceiling." : ""}
                </p>
                <a href={component.sourceUrl} rel="noreferrer">FRED {component.sourceSeriesId} ↗</a>
              </div>
              <dl>
                <dt>Weight</dt><dd>33⅓%</dd>
                <dt>Baseline p20</dt><dd>{component.lowerAnchor.toFixed(2)}</dd>
                <dt>Baseline p95</dt><dd>{component.upperAnchor.toFixed(2)}</dd>
                <dt>Normalized</dt><dd>{component.normalizedScore.toFixed(1)}</dd>
                <dt>Contribution</dt><dd>{component.pointContribution.toFixed(1)} pts</dd>
                {component.derivation === null ? (
                  <>
                    <dt>Source observation</dt>
                    <dd>{formatStressSourceValue(component.rawValue, "% of GDP")}</dd>
                  </>
                ) : (
                  <>
                    <dt>Current observation</dt>
                    <dd>
                      {formatStressSourceValue(
                        component.derivation.current.value,
                        component.id === "monetary_expansion" ? "billions USD · SA" : "index 1982–84=100 · SA",
                      )} · {formatStressObservation(component.derivation.current.observationDate)}
                    </dd>
                    <dt>Prior-year observation</dt>
                    <dd>
                      {formatStressSourceValue(
                        component.derivation.priorYear.value,
                        component.id === "monetary_expansion" ? "billions USD · SA" : "index 1982–84=100 · SA",
                      )} · {formatStressObservation(component.derivation.priorYear.observationDate)}
                    </dd>
                    <dt>Formula</dt><dd>((current ÷ prior year) − 1) × 100</dd>
                  </>
                )}
                <dt>Source updated</dt><dd>{formatUtcDate(component.sourceUpdatedAt)}</dd>
                <dt>Accessed</dt><dd>{formatUtcDate(component.accessedAt)}</dd>
              </dl>
            </li>
          ))}
          {dashboard.stress.score === null
            ? dashboard.stress.missingComponents.map((component, index) => (
                <li key={component.id}>
                  <span className="metric-numerals">{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{component.label}</strong><p>{component.reason}</p></div>
                  <dl><dt>Weight</dt><dd>33⅓%</dd><dt>Points</dt><dd>—</dd></dl>
                </li>
              ))
            : null}
        </ol>
      </section>

      <section className="shell-container dollar-metrics" aria-labelledby="dollar-metrics-title">
        <header className="dollar-section-heading">
          <div>
            <p className="section-kicker">Verified dated readings / source adjacent</p>
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
                state={metric.freshness.state === "stale" ? "stale" : "sourced"}
                detail={`Observation ${formatHistoricalMonth(metric.latest.observationDate)} · source updated ${formatUtcDate(metric.latest.sourceUpdatedAt)} · retrieved ${formatUtcDate(metric.source.accessedAt)} · freshness at evaluation: ${metric.freshness.state} (${metric.freshness.ageDays}/${metric.freshness.thresholdDays}-day window).`}
                accessory={<MetricTrend direction={metric.trend} value={metric.trendValue} context={metric.trendContext} tone="neutral" />}
              />
              <SourceCitation
                state={metric.freshness.state === "stale" ? "stale" : "sourced"}
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
              <h2 id="dollar-history-title">Bounded verified history</h2>
            </div>
            <p>Each trace is capped at 120 stored observations and remains subject to source revisions.</p>
          </header>
          <div className="dollar-chart-grid">
            {dashboard.metrics.map((metric) => <MetricSeriesChart key={metric.key} metric={metric} />)}
          </div>
        </div>
      </section>

      <section className="shell-container dollar-limitations" aria-labelledby="dollar-limits-title">
        <div><p className="section-kicker">Interpretation boundary</p><h2 id="dollar-limits-title">Read the gaps first.</h2></div>
        <ul>
          <li>{providerBacked ? "FRED observations can be revised; every activated batch remains auditable." : "Repository snapshot values are static and may differ from later revised source releases."}</li>
          <li>Series have different units and frequencies; visual proximity does not make them directly comparable.</li>
          <li>M2 and CPI are one-sided: contraction and deflationary stress are outside v1.</li>
          <li>Debt/GDP already exceeds its p95 anchor and is clipped at 100 component points.</li>
          <li>No result here predicts dollar failure, investment returns, or policy outcomes.</li>
        </ul>
      </section>
    </main>
  );
}
