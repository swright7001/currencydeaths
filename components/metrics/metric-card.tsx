import type { ReactNode } from "react";
import { DataStateBadge } from "../research/data-state-badge";
import type { DataState } from "../research/presentation-types";

type MetricCardProps = Readonly<{
  label: string;
  value: string | null;
  unit?: string;
  detail?: string;
  state: DataState;
  accessory?: ReactNode;
  footer?: ReactNode;
}>;

export function MetricCard({
  label,
  value,
  unit,
  detail,
  state,
  accessory,
  footer,
}: MetricCardProps) {
  return (
    <article className="metric-card" data-state={state}>
      <header className="metric-card__header">
        <h3>{label}</h3>
        <DataStateBadge state={state} />
      </header>
      <div className="metric-card__reading">
        <p className="metric-card__value metric-numerals">
          {value ?? (
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">No value</span>
            </>
          )}
        </p>
        {unit ? <p className="metric-card__unit">{unit}</p> : null}
        {accessory ? <div className="metric-card__accessory">{accessory}</div> : null}
      </div>
      {detail ? <p className="metric-card__detail">{detail}</p> : null}
      {footer ? <footer className="metric-card__footer">{footer}</footer> : null}
    </article>
  );
}
