import { DataStateBadge } from "../research/data-state-badge";

export type ComparisonRow = Readonly<{
  currency: string;
  period: string;
  evidence: "fixture" | "sourced" | "unavailable";
  event: string;
  outcome: string;
  isDollar?: boolean;
}>;

type UsdComparisonProps = Readonly<{
  rows: readonly ComparisonRow[];
}>;

export function UsdComparison({ rows }: UsdComparisonProps) {
  return (
    <div className="comparison-table-wrap" tabIndex={0} role="region" aria-label="Currency comparison table">
      <table className="comparison-table">
        <caption className="sr-only">
          The current U.S. dollar system compared with selected source-backed historical currency records.
        </caption>
        <thead>
          <tr>
            <th scope="col">Currency</th>
            <th scope="col">Recorded period</th>
            <th scope="col">Evidence</th>
            <th scope="col">Defining event</th>
            <th scope="col">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.currency} data-dollar={row.isDollar || undefined}>
              <th scope="row">{row.currency}</th>
              <td className="metric-numerals">{row.period}</td>
              <td><DataStateBadge state={row.evidence} /></td>
              <td>{row.event}</td>
              <td>{row.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
