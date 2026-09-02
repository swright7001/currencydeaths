import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  currencyEventTypeValidator,
  currencyStatusValidator,
  currencyTypeValidator,
  dollarMetricFrequencyValidator,
  dollarMetricKeyValidator,
  dollarMetricUnitValidator,
  failureCauseValidator,
  historicalDateValidator,
  recordStateValidator,
  regionValidator,
  sourceTypeValidator,
  subscriberSourceValidator,
  subscriberStatusValidator,
} from "./validators";

export default defineSchema({
  countries: defineTable({
    name: v.string(),
    slug: v.string(),
    isoCode: v.optional(v.string()),
    region: regionValidator,
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    seedVersion: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_iso_code", ["isoCode"])
    .index("by_region", ["region"])
    .index("by_seed_version", ["seedVersion"]),

  sources: defineTable({
    title: v.string(),
    publisher: v.string(),
    url: v.string(),
    publicationDate: v.optional(historicalDateValidator),
    accessedAt: v.number(),
    sourceType: sourceTypeValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    seedVersion: v.optional(v.string()),
  })
    .index("by_url", ["url"])
    .index("by_seed_version", ["seedVersion"]),

  currencies: defineTable({
    name: v.string(),
    slug: v.string(),
    countryId: v.id("countries"),
    symbol: v.optional(v.string()),
    currencyType: currencyTypeValidator,
    status: currencyStatusValidator,
    startDate: historicalDateValidator,
    endDate: v.optional(historicalDateValidator),
    replacementCurrencyId: v.optional(v.id("currencies")),
    replacementCurrencyName: v.optional(v.string()),
    primaryFailureCause: v.optional(failureCauseValidator),
    failureCauses: v.array(failureCauseValidator),
    summary: v.optional(v.string()),
    historicalContext: v.optional(v.string()),
    sourceIds: v.array(v.id("sources")),
    recordState: recordStateValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    seedVersion: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_country_id_and_status", ["countryId", "status"])
    .index("by_status", ["status"])
    .index("by_primary_failure_cause", ["primaryFailureCause"])
    .index("by_seed_version", ["seedVersion"]),

  currencyEvents: defineTable({
    currencyId: v.id("currencies"),
    date: historicalDateValidator,
    dateKey: v.number(),
    eventType: currencyEventTypeValidator,
    title: v.string(),
    description: v.string(),
    sourceIds: v.array(v.id("sources")),
    recordState: recordStateValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_currency_id_and_date_key", ["currencyId", "dateKey"]),

  currencyMetrics: defineTable({
    currencyId: v.id("currencies"),
    metric: v.string(),
    observationDate: historicalDateValidator,
    observationDateKey: v.number(),
    value: v.number(),
    unit: v.string(),
    sourceId: v.id("sources"),
    notes: v.optional(v.string()),
    recordState: recordStateValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_currency_id_and_metric_and_observation_date_key", [
    "currencyId",
    "metric",
    "observationDateKey",
  ]),

  dollarMetrics: defineTable({
    metric: dollarMetricKeyValidator,
    observationDate: historicalDateValidator,
    observationDateKey: v.number(),
    value: v.number(),
    unit: dollarMetricUnitValidator,
    frequency: v.optional(dollarMetricFrequencyValidator),
    sourceSeriesId: v.optional(v.string()),
    sourceUpdatedAt: v.optional(v.number()),
    fixtureBatchVersion: v.optional(v.string()),
    sourceId: v.id("sources"),
    notes: v.optional(v.string()),
    recordState: recordStateValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_metric_and_observation_date_key", ["metric", "observationDateKey"])
    .index("by_fixture_batch_version", ["fixtureBatchVersion"]),

  dollarMetricRefreshBatches: defineTable({
    batchKey: v.string(),
    payloadDigest: v.string(),
    refreshVersion: v.string(),
    methodologyVersion: v.string(),
    retrievedAt: v.number(),
    observationCount: v.number(),
    missingCount: v.number(),
    sources: v.array(
      v.object({
        metric: dollarMetricKeyValidator,
        sourceSeriesId: v.string(),
        title: v.string(),
        publisher: v.string(),
        url: v.string(),
        unit: dollarMetricUnitValidator,
        frequency: dollarMetricFrequencyValidator,
        sourceUpdatedAt: v.number(),
      }),
    ),
    createdAt: v.number(),
  })
    .index("by_batch_key", ["batchKey"])
    .index("by_created_at", ["createdAt"]),

  dollarMetricRevisions: defineTable({
    batchId: v.id("dollarMetricRefreshBatches"),
    metric: dollarMetricKeyValidator,
    observationDate: historicalDateValidator,
    observationDateKey: v.number(),
    value: v.union(v.number(), v.null()),
    unit: dollarMetricUnitValidator,
    frequency: dollarMetricFrequencyValidator,
    sourceSeriesId: v.string(),
    sourceUpdatedAt: v.number(),
    retrievedAt: v.number(),
    sourceId: v.id("sources"),
    createdAt: v.number(),
  })
    .index("by_batch_id", ["batchId"])
    .index("by_batch_id_and_metric_and_observation_date_key", [
      "batchId",
      "metric",
      "observationDateKey",
    ]),

  dollarMetricActiveDatasets: defineTable({
    key: v.string(),
    activeBatchId: v.id("dollarMetricRefreshBatches"),
    previousBatchId: v.optional(v.id("dollarMetricRefreshBatches")),
    activatedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  dollarMetricRefreshRuns: defineTable({
    runKey: v.string(),
    mode: v.union(v.literal("scheduled"), v.literal("manual")),
    outcome: v.union(
      v.literal("activated"),
      v.literal("unchanged"),
      v.literal("failed"),
    ),
    batchKey: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.number(),
  })
    .index("by_run_key", ["runKey"])
    .index("by_completed_at", ["completedAt"]),

  methodologies: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    formula: v.string(),
    version: v.string(),
    sourceIds: v.array(v.id("sources")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  emailSubscribers: defineTable({
    email: v.string(),
    emailHash: v.string(),
    status: subscriberStatusValidator,
    source: subscriberSourceValidator,
    verifiedAt: v.optional(v.number()),
    consentVersion: v.optional(v.string()),
    consentAt: v.optional(v.number()),
    verificationTokenHash: v.optional(v.string()),
    verificationTokenExpiresAt: v.optional(v.number()),
    unsubscribeTokenHash: v.optional(v.string()),
    confirmationAttemptedAt: v.optional(v.number()),
    confirmationSentAt: v.optional(v.number()),
    confirmationAttemptCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email_hash", ["emailHash"])
    .index("by_status", ["status"])
    .index("by_verification_token_hash", ["verificationTokenHash"])
    .index("by_unsubscribe_token_hash", ["unsubscribeTokenHash"]),

  watchlistRateLimits: defineTable({
    requestHash: v.string(),
    windowStartedAt: v.number(),
    attempts: v.number(),
    updatedAt: v.number(),
  }).index("by_request_hash", ["requestHash"]),
});
