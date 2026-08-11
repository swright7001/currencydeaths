import { v } from "convex/values";
import {
  WATCHLIST_RATE_LIMIT_MAX_ATTEMPTS,
  WATCHLIST_RATE_LIMIT_WINDOW_MS,
} from "../lib/watchlist";
import { internalMutation } from "./_generated/server";
import { subscriberSourceValidator } from "./validators";

const prepareResultValidator = v.union(
  v.object({ kind: v.literal("accepted") }),
  v.object({ kind: v.literal("rate_limited") }),
  v.object({
    kind: v.literal("send"),
    subscriberId: v.id("emailSubscribers"),
    email: v.string(),
    tokenHash: v.string(),
    idempotencyKey: v.string(),
    rollbackState: v.union(
      v.literal("new"),
      v.literal("unsubscribed"),
      v.literal("expired_pending"),
    ),
  }),
);

export const prepareSignup = internalMutation({
  args: {
    email: v.string(),
    emailHash: v.string(),
    requestHash: v.string(),
    source: subscriberSourceValidator,
    consentVersion: v.string(),
    now: v.number(),
    verificationTokenHash: v.string(),
    verificationTokenExpiresAt: v.number(),
    unsubscribeTokenHash: v.string(),
  },
  returns: prepareResultValidator,
  handler: async (ctx, args) => {
    const rateLimit = await ctx.db
      .query("watchlistRateLimits")
      .withIndex("by_request_hash", (q) => q.eq("requestHash", args.requestHash))
      .unique();
    if (rateLimit === null) {
      await ctx.db.insert("watchlistRateLimits", {
        requestHash: args.requestHash,
        windowStartedAt: args.now,
        attempts: 1,
        updatedAt: args.now,
      });
    } else if (args.now - rateLimit.windowStartedAt >= WATCHLIST_RATE_LIMIT_WINDOW_MS) {
      await ctx.db.patch(rateLimit._id, {
        windowStartedAt: args.now,
        attempts: 1,
        updatedAt: args.now,
      });
    } else if (rateLimit.attempts >= WATCHLIST_RATE_LIMIT_MAX_ATTEMPTS) {
      return { kind: "rate_limited" } as const;
    } else {
      await ctx.db.patch(rateLimit._id, {
        attempts: rateLimit.attempts + 1,
        updatedAt: args.now,
      });
    }

    const stored = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_email_hash", (q) => q.eq("emailHash", args.emailHash))
      .unique();
    if (
      stored !== null &&
      (stored.status === "active" ||
        stored.status === "suppressed" ||
        (stored.status === "pending" &&
          stored.verificationTokenExpiresAt !== undefined &&
          stored.verificationTokenExpiresAt > args.now))
    ) {
      return { kind: "accepted" } as const;
    }

    const confirmationAttemptCount = (stored?.confirmationAttemptCount ?? 0) + 1;
    const idempotencyKey = `watchlist-confirmation/${args.verificationTokenHash.slice(0, 40)}`;
    if (stored === null) {
      const subscriberId = await ctx.db.insert("emailSubscribers", {
        email: args.email,
        emailHash: args.emailHash,
        status: "pending",
        source: args.source,
        consentVersion: args.consentVersion,
        consentAt: args.now,
        verificationTokenHash: args.verificationTokenHash,
        verificationTokenExpiresAt: args.verificationTokenExpiresAt,
        unsubscribeTokenHash: args.unsubscribeTokenHash,
        confirmationAttemptedAt: args.now,
        confirmationAttemptCount,
        createdAt: args.now,
        updatedAt: args.now,
      });
      return {
        kind: "send",
        subscriberId,
        email: args.email,
        tokenHash: args.verificationTokenHash,
        idempotencyKey,
        rollbackState: "new",
      } as const;
    }

    const rollbackState = stored.status === "unsubscribed" ? "unsubscribed" : "expired_pending";
    await ctx.db.patch(stored._id, {
      email: args.email,
      status: "pending",
      source: args.source,
      consentVersion: args.consentVersion,
      consentAt: args.now,
      verifiedAt: undefined,
      verificationTokenHash: args.verificationTokenHash,
      verificationTokenExpiresAt: args.verificationTokenExpiresAt,
      unsubscribeTokenHash: args.unsubscribeTokenHash,
      confirmationAttemptedAt: args.now,
      confirmationSentAt: undefined,
      confirmationAttemptCount,
      updatedAt: args.now,
    });
    return {
      kind: "send",
      subscriberId: stored._id,
      email: args.email,
      tokenHash: args.verificationTokenHash,
      idempotencyKey,
      rollbackState,
    } as const;
  },
});

export const markConfirmationSent = internalMutation({
  args: {
    subscriberId: v.id("emailSubscribers"),
    tokenHash: v.string(),
    sentAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscriber = await ctx.db.get(args.subscriberId);
    if (subscriber?.verificationTokenHash === args.tokenHash) {
      await ctx.db.patch(subscriber._id, {
        confirmationSentAt: args.sentAt,
        updatedAt: args.sentAt,
      });
    }
    return null;
  },
});

export const rollbackFailedConfirmation = internalMutation({
  args: {
    subscriberId: v.id("emailSubscribers"),
    tokenHash: v.string(),
    rollbackState: v.union(
      v.literal("new"),
      v.literal("unsubscribed"),
      v.literal("expired_pending"),
    ),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscriber = await ctx.db.get(args.subscriberId);
    if (subscriber?.verificationTokenHash !== args.tokenHash) return null;
    if (args.rollbackState === "new") {
      await ctx.db.delete(subscriber._id);
      return null;
    }
    await ctx.db.patch(subscriber._id, {
      status: args.rollbackState === "unsubscribed" ? "unsubscribed" : "pending",
      verificationTokenHash: undefined,
      verificationTokenExpiresAt: undefined,
      unsubscribeTokenHash: undefined,
      confirmationSentAt: undefined,
      updatedAt: args.now,
    });
    return null;
  },
});

export const verifyToken = internalMutation({
  args: { tokenHash: v.string(), now: v.number() },
  returns: v.union(v.literal("confirmed"), v.literal("invalid_or_expired")),
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_verification_token_hash", (q) =>
        q.eq("verificationTokenHash", args.tokenHash),
      )
      .unique();
    if (
      subscriber === null ||
      subscriber.status !== "pending" ||
      subscriber.verificationTokenExpiresAt === undefined ||
      subscriber.verificationTokenExpiresAt < args.now
    ) {
      return "invalid_or_expired" as const;
    }
    await ctx.db.patch(subscriber._id, {
      status: "active",
      verifiedAt: args.now,
      verificationTokenHash: undefined,
      verificationTokenExpiresAt: undefined,
      updatedAt: args.now,
    });
    return "confirmed" as const;
  },
});

export const unsubscribeToken = internalMutation({
  args: { tokenHash: v.string(), now: v.number() },
  returns: v.literal("accepted"),
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_unsubscribe_token_hash", (q) =>
        q.eq("unsubscribeTokenHash", args.tokenHash),
      )
      .unique();
    if (subscriber !== null) {
      await ctx.db.patch(subscriber._id, {
        status: "unsubscribed",
        verificationTokenHash: undefined,
        verificationTokenExpiresAt: undefined,
        unsubscribeTokenHash: undefined,
        updatedAt: args.now,
      });
    }
    return "accepted" as const;
  },
});
