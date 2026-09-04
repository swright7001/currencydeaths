import type { Metadata } from "next";
import Link from "next/link";
import { dollarStressMethodologyV1 } from "../../../lib/methodology/dollar-stress-score";
import {
  DOLLAR_STRESS_HORIZON_THRESHOLD,
  DOLLAR_STRESS_HORIZON_VERSION,
  dollarStressHorizonScenarios,
} from "../../../lib/methodology/dollar-stress-horizon";

export const metadata: Metadata = {
  title: "Dollar Stress Score and Horizon Methodology",
  description:
    "Review the experimental CurrencyDeaths score inputs, illustrative horizon scenarios, missing-data policy, sources, and limitations.",
  alternates: { canonical: "/methodology/dollar-stress-score" },
};

function formatUnit(unit: string) {
  return unit === "percent_gdp" ? "% of GDP" : "% change / year";
}

function formatDerivation(kind: string) {
  return kind === "year_over_year_percent_change"
    ? "((current ÷ same month prior year) − 1) × 100"
    : "Source value used directly";
}

export default function DollarStressScoreMethodologyPage() {
  const methodology = dollarStressMethodologyV1;

  return (
    <main id="main-content" className="stress-methodology-page">
      <section className="stress-methodology-hero">
        <div className="shell-container stress-methodology-hero__grid">
          <div>
            <p className="section-kicker">Model file / owner approved / challengeable</p>
            <h1>Dollar Stress Score</h1>
            <p>
              A transparent index of selected historical stress signals—not a
              probability, prophecy, or predicted dollar death date.
            </p>
          </div>
          <aside aria-label="Methodology release status">
            <span>Approved experimental method</span>
            <dl>
              <div><dt>Version</dt><dd>{methodology.version}</dd></div>
              <div><dt>Methodology as of</dt><dd>{methodology.asOf}</dd></div>
              <div><dt>Output</dt><dd>0–100 stress index</dd></div>
              <div><dt>Precision</dt><dd>1 decimal place</dd></div>
              <div><dt>Baseline</dt><dd>1966–2025 frozen</dd></div>
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
          Sort each finite transformed baseline sample and calculate p20 and p95
          using R-7 linear interpolation: h=(n−1)p, interpolating between floor(h)
          and ceil(h). Map the current input linearly between those anchors and
          clamp it to 0–100.
        </p>
        <p>
          Each component has an exact one-third weight. Source values, derived rates,
          anchors, normalized values, and contributions remain unrounded; only the
          final composite is rounded to one decimal. Every result retains both raw
          observations and its source-update, access, dataset, and method versions.
        </p>
      </section>

      <section className="shell-container stress-methodology-section" aria-labelledby="components-title">
        <header>
          <div>
            <p className="section-kicker">Three inputs / 100% disclosed</p>
            <h2 id="components-title">Component register</h2>
          </div>
          <p>Frozen empirical percentile anchors; equal weights are a disclosed policy choice.</p>
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
                <div><dt>Weight</dt><dd className="metric-numerals">33⅓%</dd></div>
                <div><dt>Input derivation</dt><dd>{formatDerivation(component.inputKind)}</dd></div>
                <div><dt>p20 / 0 points</dt><dd className="metric-numerals">{component.healthyBoundary.toFixed(3)} {formatUnit(component.outputUnit)}</dd></div>
                <div><dt>p95 / 100 points</dt><dd className="metric-numerals">{component.extremeBoundary.toFixed(3)} {formatUnit(component.outputUnit)}</dd></div>
                <div><dt>Transform</dt><dd>Linear, clamped</dd></div>
                <div><dt>Stale after</dt><dd>{component.freshnessDays} days</dd></div>
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
            <h3>Withhold the score.</h3>
            <p>
              Both the source-update age and observation period-end age must pass
              the approved 75-day monthly or 180-day quarterly window. Any stale
              component suppresses the entire composite.
            </p>
          </article>
        </div>
      </section>

      <section className="shell-container stress-methodology-section" aria-labelledby="bands-title">
        <header>
          <div>
            <p className="section-kicker">Display policy / not probabilities</p>
            <h2 id="bands-title">Descriptive bands</h2>
          </div>
          <p>Equal-width labels improve readability; they are not calibrated crisis thresholds.</p>
        </header>
        <div className="stress-component-grid">
          {methodology.bands.map((band) => (
            <article key={band.label}>
              <p>{band.minimum.toFixed(1)}—{band.maximum.toFixed(1)}</p>
              <h3>{band.label} selected stress</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="stress-methodology-policy" aria-labelledby="clock-policy-title">
        <div className="shell-container stress-methodology-policy__grid">
          <div>
            <p className="section-kicker">Hero semantics / disclosed scenarios</p>
            <h2 id="clock-policy-title">Horizon, not a death date.</h2>
          </div>
          <article>
            <span>{DOLLAR_STRESS_HORIZON_VERSION}</span>
            <h3>Time to a display threshold.</h3>
            <p>
              The horizon shows approved illustrative time ranges to the
              {` ${DOLLAR_STRESS_HORIZON_THRESHOLD} / 100 `}
              “Extreme modeled stress” band. It does not estimate when the dollar
              will collapse, disappear, or be replaced.
            </p>
          </article>
          <article>
            <span>Precision boundary</span>
            <h3>It does not tick continuously.</h3>
            <p>
              Source observations update monthly and quarterly. Days remain zero,
              and scenario values change only through a separately versioned,
              reviewed, and owner-approved methodology decision.
            </p>
          </article>
        </div>
      </section>

      <section className="shell-container stress-methodology-section" aria-labelledby="horizon-scenarios-title">
        <header>
          <div>
            <p className="section-kicker">Illustrative policy assumptions / not fitted forecasts</p>
            <h2 id="horizon-scenarios-title">Horizon scenario register</h2>
          </div>
          <p>These frozen display scenarios add context to current conditions; they are not inferred from historical failure dates.</p>
        </header>
        <div className="stress-component-grid">
          {dollarStressHorizonScenarios.map((scenario) => (
            <article key={scenario.id}>
              <p>{scenario.label}</p>
              <h3>
                {scenario.midpoint === null
                  ? "No finite crossing"
                  : `${scenario.midpoint.years} years ${scenario.midpoint.months} months`}
              </h3>
              <dl>
                <div><dt>Target</dt><dd className="metric-numerals">{DOLLAR_STRESS_HORIZON_THRESHOLD} / 100</dd></div>
                <div>
                  <dt>Illustrative range</dt>
                  <dd>
                    {scenario.range === null
                      ? "Not published"
                      : `${scenario.range.minimumYears}–${scenario.range.maximumYears} years`}
                  </dd>
                </div>
                <div><dt>Day precision</dt><dd>Withheld / zero</dd></div>
              </dl>
              <p>{scenario.summary} Not a probability, prediction, or investment signal.</p>
            </article>
          ))}
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
        <Link href="/">← Return to the index</Link>
      </section>
    </main>
  );
}
