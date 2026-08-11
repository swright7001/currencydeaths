import Link from "next/link";
import { DataStateBadge } from "../research";
import {
  displayArchiveLabel,
  type CurrencyArchiveRecord,
} from "../../lib/data/currency-archive";

function formatLifespan(record: CurrencyArchiveRecord) {
  const { minimumYears, maximumYears } = record.lifespan;
  return minimumYears === maximumYears
    ? `${minimumYears} years`
    : `${minimumYears}–${maximumYears} years`;
}

export function ArchiveResultCard({ record }: Readonly<{ record: CurrencyArchiveRecord }>) {
  return (
    <article className="archive-result-card">
      <header>
        <div>
          <p>{record.countryName}</p>
          <h3>
            <Link href={`/deaths/${record.slug}`}>{record.name}</Link>
          </h3>
        </div>
        <DataStateBadge state="sourced" label="Verified seed" />
      </header>

      <dl>
        <div>
          <dt>Recorded period</dt>
          <dd className="metric-numerals">
            {record.startDate.year}—{record.endDate.year}
          </dd>
        </div>
        <div>
          <dt>Derived lifespan</dt>
          <dd className="metric-numerals">{formatLifespan(record)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{displayArchiveLabel(record.status)}</dd>
        </div>
        <div>
          <dt>Primary event</dt>
          <dd>{displayArchiveLabel(record.primaryFailureCause)}</dd>
        </div>
      </dl>

      <p>{record.summary}</p>

      <footer>
        <span>{record.sourceKeys.length} primary source references</span>
        <Link href={`/deaths/${record.slug}`}>Open research record →</Link>
      </footer>
    </article>
  );
}
