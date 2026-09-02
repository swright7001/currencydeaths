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
          <p>U.S. dollar research instrument</p>
          <h2 id="clock-title">Experimental Dollar Stress Model</h2>
        </div>
        <DataStateBadge state={score === null ? "unavailable" : "sourced"} />
      </header>

      <div className="death-clock__index" role="group" aria-label="Dollar Stress Index reading">
        <div>
          <span className="death-clock__index-value metric-numerals">{score ?? "—"}</span>
          <span className="death-clock__index-scale metric-numerals">/ 100</span>
        </div>
        <strong>{band === null ? "Score withheld" : `${band} selected stress`}</strong>
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
          Experimental index {methodologyVersion}. Not a probability, forecast,
          investment signal, or predicted failure date.
        </p>
        <Link href="/methodology/dollar-stress-score">
          Audit the inputs and weights →
        </Link>
      </footer>
    </section>
  );
}
