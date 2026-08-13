import Link from "next/link";
import { DataStateBadge } from "../research/data-state-badge";

type CurrencyRecordCardProps = Readonly<{
  name: string;
  slug: string;
  country: string;
  period: string;
  status: string;
  cause: string;
  summary: string;
}>;

export function CurrencyRecordCard({
  name,
  slug,
  country,
  period,
  status,
  cause,
  summary,
}: CurrencyRecordCardProps) {
  return (
    <article className="currency-record-card">
      <header>
        <p>{country}</p>
        <DataStateBadge state="sourced" label="Verified seed" />
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
