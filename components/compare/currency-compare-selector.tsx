import type { ComparisonCurrencyOption } from "../../lib/data/currency-comparison";

type CurrencyCompareSelectorProps = Readonly<{
  selectedSlug: string;
  options: readonly ComparisonCurrencyOption[];
}>;

export function CurrencyCompareSelector({ selectedSlug, options }: CurrencyCompareSelectorProps) {
  return (
    <form className="compare-selector" action="/compare" method="get">
      <label htmlFor="compare-currency">
        <span>Historical case</span>
        <select id="compare-currency" name="currency" defaultValue={selectedSlug}>
          {options.map((option) => (
            <option value={option.slug} key={option.slug}>
              {option.name} · {option.countryName}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">Load comparison →</button>
    </form>
  );
}
