import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveFilterForm } from "../../components/archive/archive-filter-form";
import { ArchiveResultCard } from "../../components/archive/archive-result-card";
import {
  activeArchiveFilterCount,
  createArchiveFilterOptions,
  createCurrencyArchiveRecords,
  filterCurrencyArchive,
  parseArchiveQuery,
  type ArchiveSearchParams,
} from "../../lib/data/currency-archive";
import { loadResearchCollection } from "../../lib/data/research-repository";

export const metadata: Metadata = {
  title: "Historical Currency Archive",
  description:
    "Explore a source-disciplined seed archive of historical currency replacements, redenominations, and collapses.",
  alternates: { canonical: "/deaths" },
};

export default async function DeathsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<ArchiveSearchParams> }>) {
  const loaded = await loadResearchCollection();
  const options = createArchiveFilterOptions(loaded.dataset);
  const records = createCurrencyArchiveRecords(loaded.dataset);
  const query = parseArchiveQuery(await searchParams, options);
  const results = filterCurrencyArchive(query, records);
  const activeCount = activeArchiveFilterCount(query);

  return (
    <main id="main-content" className="archive-page">
      <section className="archive-hero">
        <div className="shell-container archive-hero__grid">
          <div>
            <p className="section-kicker">Past deaths / transitions / reforms</p>
            <h1>The currency archive</h1>
          </div>
          <p>
            {records.length} source-vetted cases. Classification stays explicit: replacement,
            redenomination, currency union, and collapse are not interchangeable.
            {` ${loaded.sourceLabel}.`}
          </p>
        </div>
      </section>

      <div className="shell-container archive-workspace">
        <ArchiveFilterForm query={query} activeCount={activeCount} options={options} />

        <section className="archive-results" aria-labelledby="archive-results-title">
          <header>
            <div>
              <p className="section-kicker">Verified research seed</p>
              <h2 id="archive-results-title">
                {results.length} {results.length === 1 ? "record" : "records"}
              </h2>
            </div>
            <p aria-live="polite" data-research-source={loaded.source}>
              {activeCount === 0
                ? "Showing the complete verified seed."
                : `${activeCount} active ${activeCount === 1 ? "filter" : "filters"}.`}
            </p>
          </header>

          {results.length > 0 ? (
            <div className="archive-result-grid">
              {results.map((record) => (
                <ArchiveResultCard key={record.slug} record={record} />
              ))}
            </div>
          ) : (
            <div className="archive-empty-state" role="status">
              <span aria-hidden="true">00</span>
              <h3>No verified records match</h3>
              <p>
                Broaden the query or clear the filters. The archive will not invent
                missing classifications to force a match.
              </p>
              <Link href="/deaths">Clear filters →</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
