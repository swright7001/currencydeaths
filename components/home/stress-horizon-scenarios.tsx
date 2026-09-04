"use client";

import { useState, type CSSProperties } from "react";
import type { DollarStressHorizonScenario } from "../../lib/methodology/dollar-stress-horizon";

type StressHorizonScenariosProps = Readonly<{
  status: "illustrative" | "unavailable";
  scenarios: readonly DollarStressHorizonScenario[];
}>;

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

export function StressHorizonScenarios({
  status,
  scenarios,
}: StressHorizonScenariosProps) {
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id ?? null);
  const selected = scenarios.find((scenario) => scenario.id === selectedId) ?? null;

  if (status === "unavailable" || selected === null) {
    return (
      <div className="stress-horizon stress-horizon--unavailable" role="status">
        <p className="stress-horizon__label">Estimated midpoint to extreme modeled stress</p>
        <strong>Horizon withheld</strong>
        <p>No scenario horizon is published while the verified stress score is unavailable.</p>
      </div>
    );
  }

  return (
    <div className="stress-horizon">
      <div className="stress-horizon__controls" aria-label="Illustrative stress scenarios">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            aria-pressed={scenario.id === selected.id}
            onClick={() => setSelectedId(scenario.id)}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div className="stress-horizon__display" aria-live="polite">
        <p className="stress-horizon__label">Estimated midpoint to extreme modeled stress</p>
        {selected.midpoint === null ? (
          <strong className="stress-horizon__no-crossing">
            No threshold crossing projected
          </strong>
        ) : (
          <div className="stress-horizon__digits" aria-label={`${selected.midpoint.years} years, ${selected.midpoint.months} months, and ${selected.midpoint.days} days`}>
            <div>
              <strong className="metric-numerals">{twoDigits(selected.midpoint.years)}</strong>
              <span>Years</span>
            </div>
            <div>
              <strong className="metric-numerals">{twoDigits(selected.midpoint.months)}</strong>
              <span>Months</span>
            </div>
            <div>
              <strong className="metric-numerals">{twoDigits(selected.midpoint.days)}</strong>
              <span>Days</span>
            </div>
          </div>
        )}
        <p className="stress-horizon__summary">
          {selected.range === null
            ? selected.summary
            : `Illustrative range: ${selected.range.minimumYears}–${selected.range.maximumYears} years. ${selected.summary}`}
        </p>
      </div>

      <div className="stress-horizon__range">
        <span>Modeled uncertainty</span>
        <strong>
          {selected.range === null
            ? "No finite range"
            : `${selected.range.minimumYears}–${selected.range.maximumYears} years`}
        </strong>
        <i
          aria-hidden="true"
          style={{
            "--range-start": selected.id === "fiscal_acceleration" ? "13%" : selected.range === null ? "0%" : "26%",
            "--range-width": selected.id === "fiscal_acceleration" ? "25%" : selected.range === null ? "0%" : "32%",
          } as CSSProperties}
        />
      </div>
    </div>
  );
}
