import type { Metadata } from "next";
import Link from "next/link";
import { experimentalDollarStressMethodology } from "../../../lib/methodology/dollar-stress-score";

export const metadata: Metadata = {
  title: "Dollar Stress Score Methodology | CurrencyDeaths",
  description:
    "Review the experimental CurrencyDeaths normalization ranges, weights, missing-data policy, sources, and limitations.",
  alternates: { canonical: "/methodology/dollar-stress-score" },
};

function formatUnit(unit: string) {
  return unit === "percent_gdp" ? "% of GDP" : "% change / year";
}

export default function DollarStressScoreMethodologyPage() {
  const methodology = experimentalDollarStressMethodology;

  return (
    <main id="main-content" className="stress-methodology-page">
      <section className="stress-methodology-hero">
        <div className="shell-container stress-methodology-hero__grid">
          <div>
            <p className="section-kicker">Model file / experimental / challengeable</p>
            <h1>Dollar Stress Score</h1>
            <p>
              A transparent index of selected historical stress signals—not a
              probability, prophecy, or predicted dollar death date.
            </p>
          </div>
          <aside aria-label="Methodology release status">
            <span>Not production approved</span>
            <dl>
              <div><dt>Version</dt><dd>{methodology.version}</dd></div>
              <div><dt>Methodology as of</dt><dd>{methodology.asOf}</dd></div>
              <div><dt>Output</dt><dd>0–100 stress index</dd></div>
              <div><dt>Precision</dt><dd>1 decimal place</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="shell-container stress-methodology-formula" aria-labelledby="formula-title">
        <div>
          <p className="section-kicker">Calculation / no hidden probability</p>
          <h2 id="formula-title">Normalize. Weight. Add.</h2>
        </div>
        <p className="metric-numerals" role="math" aria-label="Stress score equals the sum of each normalized component multiplied by its weight">
          SCORE = Σ ( NORMALIZED COMPONENT × WEIGHT )
        </p>
        <p>
          Each input is mapped linearly between a disclosed lower and upper
          boundary, then clamped to 0–100. Its normalized value is multiplied by
          the listed weight. The final sum is rounded once to one decimal place.
        </p>
      </section>

      <section className="shell-container stress-methodology-section" aria-labelledby="components-title">
        <header>
          <div>
            <p className="section-kicker">Three inputs / 100% disclosed</p>
            <h2 id="components-title">Component register</h2>
          </div>
          <p>These ranges are research assumptions, not universal danger thresholds.</p>
        </header>
        <div className="stress-component-grid">
          {methodology.components.map((component, index) => (
            <article key={component.id}>
              <div className="stress-component-index metric-numerals" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </div>
              <p>{component.label}</p>
              <h3>{component.inputLabel}</h3>
              <dl>
                <div><dt>Weight</dt><dd className="metric-numerals">{component.weight * 100}%</dd></div>
                <div><dt>0-point boundary</dt><dd className="metric-numerals">{component.healthyBoundary} {formatUnit(component.unit)}</dd></div>
                <div><dt>100-point boundary</dt><dd className="metric-numerals">{component.extremeBoundary} {formatUnit(component.unit)}</dd></div>
                <div><dt>Transform</dt><dd>Linear, clamped</dd></div>
              </dl>
              <p>{component.rationale}</p>
              <a href={component.sourceUrl} rel="noreferrer">
                FRED {component.sourceSeriesId} source ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="stress-methodology-policy" aria-labelledby="policy-title">
        <div className="shell-container stress-methodology-policy__grid">
          <div>
            <p className="section-kicker">Fail visibly / never invent zero</p>
            <h2 id="policy-title">Missing and stale data</h2>
          </div>
          <article>
            <span>Missing input</span>
            <h3>Withhold the score.</h3>
            <p>
              If any required component is absent, the engine returns an unavailable
              result and names the missing component. Missing never becomes zero.
            </p>
          </article>
          <article>
            <span>Stale input</span>
            <h3>Calculate, then flag.</h3>
            <p>
              A stale observation keeps its measured value and contribution, while
              the entire result becomes provisional and names every stale component.
            </p>
          </article>
        </div>
      </section>

      <section className="shell-container stress-methodology-section" aria-labelledby="limits-title">
        <header>
          <div>
            <p className="section-kicker">Interpretation boundary</p>
            <h2 id="limits-title">What the score cannot tell you</h2>
          </div>
          <p>A compact model creates legibility, not certainty.</p>
        </header>
        <ol className="stress-limit-list">
          {methodology.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
        </ol>
      </section>

      <section className="shell-container stress-methodology-history" aria-labelledby="history-title">
        <div>
          <p className="section-kicker">Immutable versions / explicit changes</p>
          <h2 id="history-title">Change history</h2>
        </div>
        {methodology.changeHistory.map((entry) => (
          <article key={entry.version}>
            <time dateTime={entry.date}>{entry.date}</time>
            <strong>{entry.version}</strong>
            <p>{entry.summary}</p>
          </article>
        ))}
        <Link href="/">← Return to countdown</Link>
      </section>
    </main>
  );
}
