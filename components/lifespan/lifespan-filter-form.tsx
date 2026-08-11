import Link from "next/link";
import {
  lifespanFilterOptions,
  type LifespanQuery,
} from "../../lib/data/lifespan-research";

type Option = Readonly<{ value: string; label: string }>;

function FilterSelect({
  id,
  label,
  name,
  options,
  value,
}: Readonly<{
  id: string;
  label: string;
  name: string;
  options: readonly Option[];
  value: string;
}>) {
  return (
    <label htmlFor={id}>
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

export function LifespanFilterForm({
  query,
  activeCount,
}: Readonly<{ query: LifespanQuery; activeCount: number }>) {
  return (
    <form className="lifespan-filters" action="/lifespan" method="get">
      <header>
        <div>
          <p>Research controls</p>
          <h2>Interrogate the sample</h2>
        </div>
        <span aria-live="polite">{String(activeCount).padStart(2, "0")} active</span>
      </header>
      <div>
        <FilterSelect id="lifespan-region" label="Region" name="region" options={lifespanFilterOptions.regions} value={query.region} />
        <FilterSelect id="lifespan-cause" label="Documented cause" name="cause" options={lifespanFilterOptions.causes} value={query.cause} />
        <FilterSelect id="lifespan-era" label="Transition era" name="era" options={lifespanFilterOptions.eras} value={query.era} />
      </div>
      <footer>
        <button type="submit">Apply filters</button>
        <Link href="/lifespan">Clear all</Link>
      </footer>
    </form>
  );
}
