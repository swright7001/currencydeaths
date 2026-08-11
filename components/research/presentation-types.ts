export const dataStates = [
  "sourced",
  "stale",
  "fixture",
  "empty",
  "unavailable",
] as const;

export type DataState = (typeof dataStates)[number];

export type DataStateDescriptor = Readonly<{
  label: string;
  description: string;
}>;

export const dataStateDescriptors: Record<DataState, DataStateDescriptor> = {
  sourced: {
    label: "Sourced",
    description: "Backed by a cited source.",
  },
  stale: {
    label: "Stale",
    description: "Source-backed, but due for an update.",
  },
  fixture: {
    label: "Development fixture",
    description: "Demonstration data; not a published claim.",
  },
  empty: {
    label: "No observations",
    description: "No observations are available for this view.",
  },
  unavailable: {
    label: "Unavailable",
    description: "The metric is not available from an approved source.",
  },
};

export type TrendDirection = "up" | "down" | "flat";

export type TrendTone = "neutral" | "positive" | "caution" | "critical";

export type RiskLevel = "low" | "moderate" | "high" | "extreme" | "unavailable";

export type SourceReference = Readonly<{
  title: string;
  publisher: string;
  url?: string;
  publicationDate?: string;
  accessedDate?: string;
}>;

export type ChartLegendItem = Readonly<{
  label: string;
  marker: "line" | "dash" | "dot" | "triangle";
  tone?: "signal" | "caution" | "neutral" | "positive";
}>;
