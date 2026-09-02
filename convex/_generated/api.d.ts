/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as dollarMetricRefresh from "../dollarMetricRefresh.js";
import type * as dollarMetricRefreshStore from "../dollarMetricRefreshStore.js";
import type * as dollarMetrics from "../dollarMetrics.js";
import type * as http from "../http.js";
import type * as research from "../research.js";
import type * as seedVerifiedCurrencies from "../seedVerifiedCurrencies.js";
import type * as validators from "../validators.js";
import type * as watchlist from "../watchlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  dollarMetricRefresh: typeof dollarMetricRefresh;
  dollarMetricRefreshStore: typeof dollarMetricRefreshStore;
  dollarMetrics: typeof dollarMetrics;
  http: typeof http;
  research: typeof research;
  seedVerifiedCurrencies: typeof seedVerifiedCurrencies;
  validators: typeof validators;
  watchlist: typeof watchlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
