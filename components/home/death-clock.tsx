import Link from "next/link";
import { DataStateBadge } from "../research/data-state-badge";

type ClockUnit = Readonly<{
  label: "Years" | "Months" | "Days" | "Hours";
  value: string;
}>;

type DeathClockProps = Readonly<{
  units: readonly ClockUnit[];
}>;

export function DeathClock({ units }: DeathClockProps) {
  return (
    <section className="death-clock" id="countdown" aria-labelledby="clock-title">
      <header className="death-clock__header">
        <div>
          <p>U.S. dollar research instrument</p>
          <h2 id="clock-title">Experimental Dollar Stress Model</h2>
        </div>
        <DataStateBadge state="fixture" />
      </header>

      <div className="death-clock__display" aria-label="Illustrative model interval">
        {units.map((unit) => (
          <div key={unit.label}>
            <span className="death-clock__value metric-numerals">{unit.value}</span>
            <span className="death-clock__unit">{unit.label}</span>
          </div>
        ))}
      </div>

      <footer className="death-clock__footer">
        <p>
          Visual fixture only. This interval does not run and is not a forecast,
          probability, or predicted failure date.
        </p>
        <Link href="/methodology/dollar-stress-score">
          How the future model will work →
        </Link>
      </footer>
    </section>
  );
}
