import type { TrendDirection } from "../research/presentation-types";

type MetricTrendProps = Readonly<{
  direction: TrendDirection;
  value: string;
  context: string;
}>;

const directionLabels: Record<TrendDirection, string> = {
  up: "Increased",
  down: "Decreased",
  flat: "Unchanged",
};

const directionMarks: Record<TrendDirection, string> = {
  up: "↗",
  down: "↘",
  flat: "→",
};

export function MetricTrend({ direction, value, context }: MetricTrendProps) {
  return (
    <p className="metric-trend" data-direction={direction}>
      <span className="metric-trend__mark" aria-hidden="true">
        {directionMarks[direction]}
      </span>
      <span className="sr-only">{directionLabels[direction]} </span>
      <strong>{value}</strong>
      <span>{context}</span>
    </p>
  );
}
