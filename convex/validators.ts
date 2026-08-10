import { v } from "convex/values";

export const historicalDatePrecisionValidator = v.union(
  v.literal("year"),
  v.literal("month"),
  v.literal("day"),
);

export const historicalDateValidator = v.object({
  year: v.number(),
  month: v.optional(v.number()),
  day: v.optional(v.number()),
  precision: historicalDatePrecisionValidator,
});

export const currencyStatusValidator = v.union(
  v.literal("active"),
  v.literal("dead"),
  v.literal("replaced"),
  v.literal("redenominated"),
  v.literal("collapsed"),
  v.literal("historical"),
);

export const currencyTypeValidator = v.union(
  v.literal("fiat"),
  v.literal("commodity_backed"),
  v.literal("currency_union"),
  v.literal("colonial"),
  v.literal("transitional"),
  v.literal("other"),
);

export const failureCauseValidator = v.union(
  v.literal("hyperinflation"),
  v.literal("war"),
  v.literal("regime_change"),
  v.literal("debt_crisis"),
  v.literal("currency_union"),
  v.literal("redenomination"),
  v.literal("monetary_reform"),
  v.literal("political_collapse"),
  v.literal("loss_of_confidence"),
  v.literal("peg_failure"),
  v.literal("colonial_transition"),
  v.literal("replacement"),
  v.literal("other"),
);

export const currencyEventTypeValidator = v.union(
  v.literal("creation"),
  v.literal("policy_change"),
  v.literal("devaluation"),
  v.literal("inflation_milestone"),
  v.literal("redenomination"),
  v.literal("replacement"),
  v.literal("withdrawal"),
  v.literal("political_event"),
  v.literal("economic_event"),
  v.literal("other"),
);

export const sourceTypeValidator = v.union(
  v.literal("central_bank"),
  v.literal("government"),
  v.literal("international_institution"),
  v.literal("academic"),
  v.literal("book"),
  v.literal("archival"),
  v.literal("dataset"),
  v.literal("other"),
);

export const regionValidator = v.union(
  v.literal("africa"),
  v.literal("asia"),
  v.literal("europe"),
  v.literal("middle_east"),
  v.literal("north_america"),
  v.literal("oceania"),
  v.literal("south_america"),
  v.literal("transregional"),
);

export const recordStateValidator = v.union(
  v.literal("development_fixture"),
  v.literal("verified"),
);

export const subscriberStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("unsubscribed"),
  v.literal("suppressed"),
);

export const subscriberSourceValidator = v.union(
  v.literal("homepage"),
  v.literal("watchlist"),
  v.literal("import"),
);
