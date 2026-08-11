import type { ReactNode } from "react";
import { DataStateBadge } from "../research/data-state-badge";
import type {
  ChartLegendItem,
  DataState,
} from "../research/presentation-types";

type ChartFrameProps = Readonly<{
  title: string;
  description: string;
  state: DataState;
  children: ReactNode;
  eyebrow?: string;
  legend?: readonly ChartLegendItem[];
}>;

export function ChartFrame({
  title,
  description,
  state,
  children,
  eyebrow = "Historical series",
  legend = [],
}: ChartFrameProps) {
  return (
    <figure className="chart-frame" data-state={state}>
      <header className="chart-frame__header">
        <div>
          <p className="chart-frame__eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <DataStateBadge state={state} />
      </header>
      <div className="chart-frame__plot">{children}</div>
      {legend.length > 0 ? (
        <ul className="chart-frame__legend" aria-label="Chart legend">
          {legend.map((item) => (
            <li key={`${item.label}-${item.marker}`}>
              <span
                className="chart-frame__legend-mark"
                data-marker={item.marker}
                data-tone={item.tone ?? "neutral"}
                aria-hidden="true"
              />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
      <figcaption>
        <span className="sr-only">Chart description: </span>
        {description}
      </figcaption>
    </figure>
  );
}
