import Link from "next/link";
import type { buildDollarStressHorizon } from "../../lib/methodology/dollar-stress-horizon";
import { DataStateBadge } from "../research/data-state-badge";
import { StressHorizonScenarios } from "./stress-horizon-scenarios";

type DollarStressIndexProps = Readonly<{
  score: string | null;
  band: string | null;
  methodologyVersion: string;
  contributions: readonly Readonly<{
    id: string;
    label: string;
    normalizedScore: number;
    pointContribution: number;
  }>[];
  horizon: ReturnType<typeof buildDollarStressHorizon>;
}>;

export function DollarStressIndex({
  score,
  band,
  methodologyVersion,
  contributions,
  horizon,
}: DollarStressIndexProps) {
  return (
    <section className="death-clock" id="countdown" aria-labelledby="clock-title">
      <header className="death-clock__header">
        <div>
          <p>Experimental model / illustrative horizon</p>
          <h2 id="clock-title">Dollar Stress Horizon</h2>
        </div>
        <DataStateBadge
          state={score === null ? "unavailable" : "fixture"}
          label={score === null ? "Horizon unavailable" : "Illustrative horizon"}
        />
      </header>

      <StressHorizonScenarios
        status={horizon.status}
        scenarios={horizon.scenarios}
      />

      <div className="death-clock__conditions">
        <div className="death-clock__index" role="group" aria-label="Dollar Stress Index reading">
          <span>Dollar Stress Index</span>
          <div>
            <strong className="death-clock__index-value metric-numerals">{score ?? "—"}</strong>
            <span className="death-clock__index-scale metric-numerals">/ 100</span>
          </div>
          <b>{band === null ? "Score withheld" : `${band} selected stress`}</b>
          <i aria-hidden="true"><span style={{ width: `${score ?? 0}%` }} /></i>
        </div>
        <div>
          <span>Threshold being modeled</span>
          <strong className="metric-numerals">{horizon.threshold} / 100</strong>
          <p>“Extreme” is a display-policy threshold, not proof of collapse.</p>
        </div>
        <div>
          <span>Precision policy</span>
          <strong>Monthly / quarterly</strong>
          <p>The horizon changes only after a reviewed data or method revision.</p>
        </div>
        {horizon.plainLanguage === null ? null : (
          <p className="death-clock__plain-language">
            <strong>In plain English:</strong> {horizon.plainLanguage}
          </p>
        )}
      </div>

      <ol className="death-clock__components" aria-label="Index component contributions">
        {contributions.map((component) => (
          <li key={component.id}>
            <span>{component.label}</span>
            <strong className="metric-numerals">{component.pointContribution.toFixed(1)} pts</strong>
            <i aria-hidden="true" style={{ width: `${component.normalizedScore}%` }} />
          </li>
        ))}
      </ol>

      <footer className="death-clock__footer">
        <p>
          Verified index {methodologyVersion}; illustrative horizon {horizon.version}.
          Neither is a probability, forecast, investment signal, or predicted failure date.
        </p>
        <Link href="/methodology/dollar-stress-score">
          Audit the inputs and weights →
        </Link>
      </footer>
    </section>
  );
}
