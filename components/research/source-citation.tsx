import { DataStateBadge } from "./data-state-badge";
import type { DataState, SourceReference } from "./presentation-types";

type SourceCitationProps = Readonly<{
  source: SourceReference;
  state?: Extract<DataState, "sourced" | "stale" | "fixture" | "unavailable">;
  claim?: string;
  ariaLabel?: string;
}>;

export function SourceCitation({
  source,
  state = "sourced",
  claim,
  ariaLabel = "Source citation",
}: SourceCitationProps) {
  const sourceName = source.url ? (
    <a href={source.url} rel="noreferrer">
      {source.title}
    </a>
  ) : (
    source.title
  );

  return (
    <aside className="source-citation" data-state={state} aria-label={ariaLabel}>
      <div className="source-citation__rail" aria-hidden="true" />
      <div className="source-citation__body">
        <div className="source-citation__heading">
          <span>Source record</span>
          <DataStateBadge state={state} />
        </div>
        {claim ? <p className="source-citation__claim">{claim}</p> : null}
        <p className="source-citation__reference">
          <cite>{sourceName}</cite>
          <span>{source.publisher}</span>
        </p>
        {source.publicationDate || source.accessedDate ? (
          <p className="source-citation__dates metric-numerals">
            {source.publicationDate ? `Published ${source.publicationDate}` : null}
            {source.publicationDate && source.accessedDate ? " · " : null}
            {source.accessedDate ? `Accessed ${source.accessedDate}` : null}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
