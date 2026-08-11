import { DataStateBadge } from "../research";

const unavailableSections = [
  "Economic context (separated)",
  "Political context (separated)",
  "What happened to savers",
  "What happened to wages",
  "What happened to debts",
  "What happened to real assets",
] as const;

export function UnavailableResearchGrid() {
  return (
    <div className="unavailable-research-grid">
      {unavailableSections.map((label) => (
        <article key={label}>
          <DataStateBadge state="unavailable" />
          <h3>{label}</h3>
          <p>
            No claim-level evidence for this section is present in the verified
            seed. Nothing is inferred.
          </p>
        </article>
      ))}
    </div>
  );
}
