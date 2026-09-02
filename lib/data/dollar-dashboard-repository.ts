import { fetchQuery } from "convex/nextjs";
import { connection } from "next/server";
import { api } from "../../convex/_generated/api";
import { getOptionalConvexUrl } from "../env/convex";
import { dollarMetricKeys, type DollarMetricKey } from "./dollar-metric-contracts";
import type { DollarMetricSeriesContract } from "./dollar-metric-query-contract";
import {
  buildDollarDashboardFromSeries,
  buildSnapshotDollarDashboard,
  type DollarDashboardModel,
} from "./dollar-dashboard";

type DollarSeriesFetcher = (
  url: string,
  metric: DollarMetricKey,
  asOf: number,
) => Promise<DollarMetricSeriesContract | null>;

type LoadOptions = Readonly<{
  convexUrl?: string;
  asOf?: number;
  fetcher?: DollarSeriesFetcher;
}>;

const defaultFetcher: DollarSeriesFetcher = (url, metric, asOf) =>
  fetchQuery(
    api.dollarMetrics.getSeries,
    { metric, asOf, directionWindowSize: 3, contextLimit: 120 },
    { url },
  );

export class DollarDashboardDataError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DollarDashboardDataError";
  }
}

export async function loadDollarDashboard(
  options: LoadOptions = {},
): Promise<DollarDashboardModel> {
  const url = getOptionalConvexUrl(options.convexUrl ?? process.env.NEXT_PUBLIC_CONVEX_URL);
  if (url === null) return buildSnapshotDollarDashboard(options.asOf);
  if (options.fetcher === undefined) await connection();
  const asOf = options.asOf ?? Date.now();
  try {
    const results = await Promise.all(
      dollarMetricKeys.map((metric) => (options.fetcher ?? defaultFetcher)(url, metric, asOf)),
    );
    if (results.some((result) => result === null)) {
      throw new DollarDashboardDataError(
        "The configured dollar dataset is incomplete; no repository fallback was used.",
      );
    }
    const series = results as DollarMetricSeriesContract[];
    const datasetVersions = new Set(series.map((item) => item.datasetVersion));
    const retrievalTimes = new Set(series.map((item) => item.retrievedAt));
    if (datasetVersions.size !== 1 || retrievalTimes.size !== 1) {
      throw new DollarDashboardDataError(
        "The configured dollar series do not belong to one atomic dataset.",
      );
    }
    return buildDollarDashboardFromSeries(series, {
      datasetVersion: series[0].datasetVersion,
      retrievedAt: series[0].retrievedAt,
    });
  } catch (error) {
    if (error instanceof DollarDashboardDataError) throw error;
    throw new DollarDashboardDataError(
      "The configured dollar dataset could not be loaded; no repository fallback was used.",
      { cause: error },
    );
  }
}
