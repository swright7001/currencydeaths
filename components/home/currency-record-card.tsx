import Link from "next/link";
import { DataStateBadge } from "../research/data-state-badge";
import type { DataState } from "../research/presentation-types";

type CurrencyRecordCardProps = Readonly<{
  name: string;
  slug: string;
  country: string;
  period: string;
  status: string;
  cause: string;
  summary: string;
  evidence: Extract<DataState, "sourced" | "stale">;
}>;

export function CurrencyRecordCard({
  name,
  slug,
  country,
  period,
  status,
  cause,
  summary,
  evidence,
}: CurrencyRecordCardProps) {
  return (
    <article className="currency-record-card">
      <header>
        <p>{country}</p>
        <DataStateBadge
          state={evidence}
          label={evidence === "stale" ? "Verified seed · refresh due" : "Verified seed"}
        />
      </header>
      <div className="currency-record-card__body">
        <h3>{name}</h3>
        <p className="currency-record-card__period metric-numerals">{period}</p>
        <dl>
          <div>
            <dt>Status</dt>
            <dd>{status}</dd>
          </div>
          <div>
            <dt>Primary event</dt>
            <dd>{cause}</dd>
          </div>
        </dl>
        <p className="currency-record-card__summary">{summary}</p>
      </div>
      <footer>
        <Link href={`/deaths/${slug}`}>Open research record →</Link>
      </footer>
    </article>
  );
}
