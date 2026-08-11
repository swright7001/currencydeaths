import { ChartFrame } from "../charts/chart-frame";
import {
  formatHistoricalMonth,
  type DollarDashboardMetric,
} from "../../lib/data/dollar-dashboard";

type MetricSeriesChartProps = Readonly<{ metric: DollarDashboardMetric }>;

export function buildMetricSeriesChartPoints(values: readonly number[]) {
  if (values.length === 0) return "";
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 320 : 24 + (index / (values.length - 1)) * 592;
      const normalized = spread === 0 ? 0.5 : (value - minimum) / spread;
      return `${x.toFixed(1)},${(176 - normalized * 132).toFixed(1)}`;
    })
    .join(" ");
}

export function MetricSeriesChart({ metric }: MetricSeriesChartProps) {
  const description = `${metric.label} development fixture contains ${metric.observations.length} observations from ${formatHistoricalMonth(metric.observations[0].observationDate)} through ${formatHistoricalMonth(metric.latest.observationDate)}. Latest value: ${metric.displayValue} ${metric.unitLabel}.`;
  const points = buildMetricSeriesChartPoints(
    metric.observations.map((item) => item.value),
  );
  const pointPairs = points.split(" ");

  return (
    <ChartFrame
      title={metric.label}
      description={description}
      state="fixture"
      eyebrow={`${metric.latest.sourceSeriesId} / ${metric.latest.frequency}`}
      legend={[{ label: "Development fixture", marker: "line", tone: "signal" }]}
    >
      <svg viewBox="0 0 640 210" role="img" aria-label={description}>
        <path className="dollar-chart-guides" d="M24 44H616M24 110H616M24 176H616" />
        <polyline className="dollar-chart-line" points={points} />
        {metric.observations.map((item, index) => {
          const [x, y] = pointPairs[index].split(",");
          return <circle key={`${item.observationDate.year}-${item.observationDate.month}`} className="dollar-chart-point" cx={x} cy={y} r="4" />;
        })}
      </svg>
      <ol className="sr-only" aria-label={`${metric.label} observation values`}>
        {metric.observations.map((item) => (
          <li key={`${item.observationDate.year}-${item.observationDate.month}-value`}>
            {formatHistoricalMonth(item.observationDate)}: {item.value} in source unit {item.unit}
          </li>
        ))}
      </ol>
    </ChartFrame>
  );
}
