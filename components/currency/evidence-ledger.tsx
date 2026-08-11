import { DataStateBadge } from "../research";
import type { CurrencyDetail } from "../../lib/data/currency-detail";

export function EvidenceLedger({
  claims,
}: Readonly<{ claims: CurrencyDetail["claims"] }>) {
  return (
    <div className="evidence-ledger">
      {claims.map((claim) => (
        <article key={claim.field}>
          <header>
            <span>{claim.field.replaceAll("/", " / ")}</span>
            <DataStateBadge state="sourced" label="Claim sourced" />
          </header>
          <p>{claim.statement}</p>
          {claim.ambiguity !== undefined ? (
            <aside>
              <strong>Recorded ambiguity</strong>
              <span>{claim.ambiguity}</span>
            </aside>
          ) : null}
          <footer>
            {claim.sources.map((source) => (
              <a
                key={source.key}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.title} — {source.publisher} ↗
              </a>
            ))}
          </footer>
        </article>
      ))}
    </div>
  );
}
