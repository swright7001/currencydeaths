import Link from "next/link";
import {
  archiveEras,
  archiveLifespanBands,
  displayArchiveLabel,
  type ArchiveFilterOptions,
  type ArchiveQuery,
} from "../../lib/data/currency-archive";

type ArchiveFilterFormProps = Readonly<{
  query: ArchiveQuery;
  activeCount: number;
  options: ArchiveFilterOptions;
}>;

type SelectOption = Readonly<{ value: string; label: string }>;

function ArchiveSelect({
  id,
  name,
  label,
  value,
  options,
}: Readonly<{
  id: string;
  name: string;
  label: string;
  value: string;
  options: readonly SelectOption[];
}>) {
  return (
    <label className="archive-filter-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} name={name} defaultValue={value}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const labeled = (values: readonly string[]) =>
  values.map((value) => ({ value, label: displayArchiveLabel(value) }));

export function ArchiveFilterForm({ query, activeCount, options }: ArchiveFilterFormProps) {
  return (
    <form className="archive-filter-panel" action="/deaths" method="get">
      <header>
        <div>
          <p>Archive controls</p>
          <h2>Search the verified record</h2>
        </div>
        <span className="metric-numerals" aria-live="polite">
          {String(activeCount).padStart(2, "0")} active
        </span>
      </header>

      <label className="archive-search-field" htmlFor="archive-search">
        <span>Search</span>
        <input
          id="archive-search"
          name="q"
          type="search"
          maxLength={80}
          defaultValue={query.search}
          placeholder="Currency, country, event, or successor"
        />
      </label>

      <div className="archive-filter-grid">
        <ArchiveSelect
          id="archive-country"
          name="country"
          label="Country"
          value={query.country}
          options={options.countries}
        />
        <ArchiveSelect
          id="archive-region"
          name="region"
          label="Region"
          value={query.region}
          options={labeled(options.regions)}
        />
        <ArchiveSelect
          id="archive-era"
          name="era"
          label="Transition era"
          value={query.era}
          options={archiveEras}
        />
        <ArchiveSelect
          id="archive-cause"
          name="cause"
          label="Documented cause"
          value={query.cause}
          options={labeled(options.causes)}
        />
        <ArchiveSelect
          id="archive-type"
          name="type"
          label="Currency type"
          value={query.currencyType}
          options={labeled(options.currencyTypes)}
        />
        <ArchiveSelect
          id="archive-status"
          name="status"
          label="Status"
          value={query.status}
          options={labeled(options.statuses)}
        />
        <ArchiveSelect
          id="archive-lifespan"
          name="lifespan"
          label="Derived lifespan"
          value={query.lifespan}
          options={archiveLifespanBands}
        />
        <label className="archive-filter-field" htmlFor="archive-inflation">
          <span>Inflation severity</span>
          <select id="archive-inflation" disabled aria-describedby="inflation-note">
            <option>Unavailable</option>
          </select>
        </label>
      </div>

      <p className="archive-filter-note" id="inflation-note">
        Inflation severity is not inferred because this verified seed does not
        contain a comparable sourced series.
      </p>

      <footer>
        <button type="submit">Apply filters</button>
        <Link href="/deaths">Clear all</Link>
      </footer>
    </form>
  );
}
