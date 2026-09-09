import Link from "next/link";
import { DataStateBadge } from "../research/data-state-badge";

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
}>;

export function DollarStressIndex({
  score,
  band,
  methodologyVersion,
  contributions,
}: DollarStressIndexProps) {
  return (
    <section className="death-clock" id="countdown" aria-labelledby="clock-title">
      <header className="death-clock__header">
        <div>
          <p>Experimental model / sourced inputs</p>
          <h2 id="clock-title">Dollar Stress Index</h2>
        </div>
        <DataStateBadge
          state={score === null ? "unavailable" : "sourced"}
          label={score === null ? "Score unavailable" : "Source-backed index"}
        />
      </header>

      <div className="death-clock__index" role="group" aria-label="Dollar Stress Index reading">
        <div>
          <strong className="death-clock__index-value metric-numerals">{score ?? "—"}</strong>
          <span className="death-clock__index-scale metric-numerals">/ 100</span>
        </div>
        <strong>{band === null ? "Score withheld" : `${band} selected stress`}</strong>
      </div>

      <p className="death-clock__plain-language">
        <strong>In plain English:</strong>{" "}
        {score === null
          ? "A required input is missing or out of date, so no score is shown."
          : "Higher scores mean more pressure across money growth, consumer prices, and federal debt. The rating names the score’s band on a 0–100 scale; it is not a chance of dollar failure."}
      </p>

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
          Methodology {methodologyVersion}. No supported model currently links this score to a failure date.
        </p>
        <Link href="/methodology/dollar-stress-score">
          Audit the inputs and weights →
        </Link>
      </footer>
    </section>
  );
}
