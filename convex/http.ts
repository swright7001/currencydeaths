import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  buildWatchlistConfirmationEmail,
  createWatchlistLookupHash,
  createWatchlistToken,
  createWatchlistTokenHash,
  normalizeWatchlistEmail,
  secretsMatch,
  WATCHLIST_CONSENT_VERSION,
  WATCHLIST_TOKEN_TTL_MS,
  type WatchlistPublicResult,
} from "../lib/watchlist";

type WatchlistConfig = Readonly<{
  actionSecret: string;
  emailHashSecret: string;
  resendApiKey: string;
  fromEmail: string;
  publicUrl: string;
}>;

function json(result: WatchlistPublicResult, status = 200) {
  return new Response(JSON.stringify(result), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function readConfig(): WatchlistConfig | null {
  const candidate = {
    actionSecret: process.env.WATCHLIST_ACTION_SECRET,
    emailHashSecret: process.env.SUBSCRIBER_HASH_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.WATCHLIST_FROM_EMAIL,
    publicUrl: process.env.WATCHLIST_PUBLIC_URL,
  };
  if (Object.values(candidate).some((value) => value === undefined || value.length < 8)) return null;
  const config = candidate as WatchlistConfig;
  try {
    new URL(config.publicUrl);
  } catch {
    return null;
  }
  return config;
}

function isAuthorized(request: Request, config: WatchlistConfig) {
  const authorization = request.headers.get("authorization");
  return (
    authorization !== null &&
    authorization.startsWith("Bearer ") &&
    secretsMatch(authorization.slice(7), config.actionSecret)
  );
}

async function readObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const subscribe = httpAction(async (ctx, request) => {
  const body = await readObject(request);
  if (body !== null && typeof body.company === "string" && body.company.length > 0) {
    return json({ status: "accepted" });
  }
  const config = readConfig();
  if (config === null) return json({ status: "configuration_unavailable" }, 503);
  if (!isAuthorized(request, config)) return json({ status: "temporary_error" }, 401);
  const email = normalizeWatchlistEmail(body?.email);
  const consent = body?.consent === true;
  const requestKey = typeof body?.requestKey === "string" ? body.requestKey : "";
  if (email === null || !consent || requestKey.length < 1 || requestKey.length > 512) {
    return json({ status: "invalid_request" }, 400);
  }

  const now = Date.now();
  const verificationToken = createWatchlistToken();
  const unsubscribeToken = createWatchlistToken();
  const [emailHash, requestHash, verificationTokenHash, unsubscribeTokenHash] = await Promise.all([
    createWatchlistLookupHash(email, config.emailHashSecret),
    createWatchlistLookupHash(requestKey, config.emailHashSecret),
    createWatchlistTokenHash(verificationToken),
    createWatchlistTokenHash(unsubscribeToken),
  ]);
  const prepared = await ctx.runMutation(internal.watchlist.prepareSignup, {
    email,
    emailHash,
    requestHash,
    source: "homepage",
    consentVersion: WATCHLIST_CONSENT_VERSION,
    now,
    verificationTokenHash,
    verificationTokenExpiresAt: now + WATCHLIST_TOKEN_TTL_MS,
    unsubscribeTokenHash,
  });
  if (prepared.kind === "accepted") return json({ status: "accepted" });
  if (prepared.kind === "rate_limited") return json({ status: "rate_limited" }, 429);

  const content = buildWatchlistConfirmationEmail(
    config.publicUrl,
    verificationToken,
    unsubscribeToken,
  );
  let providerAccepted = false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.resendApiKey}`,
        "content-type": "application/json",
        "idempotency-key": prepared.idempotencyKey,
      },
      body: JSON.stringify({
        from: config.fromEmail,
        to: [prepared.email],
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
    });
    providerAccepted = response.ok;
  } catch {
    providerAccepted = false;
  }
  if (!providerAccepted) {
    await ctx.runMutation(internal.watchlist.rollbackFailedConfirmation, {
      subscriberId: prepared.subscriberId,
      tokenHash: prepared.tokenHash,
      rollbackState: prepared.rollbackState,
      now: Date.now(),
    });
    // Match the response returned for existing addresses so a provider outage
    // cannot be used to distinguish subscriber state.
    return json({ status: "accepted" });
  }
  await ctx.runMutation(internal.watchlist.markConfirmationSent, {
    subscriberId: prepared.subscriberId,
    tokenHash: prepared.tokenHash,
    sentAt: Date.now(),
  });
  return json({ status: "accepted" });
});

const verify = httpAction(async (ctx, request) => {
  const config = readConfig();
  if (config === null) return json({ status: "configuration_unavailable" }, 503);
  if (!isAuthorized(request, config)) return json({ status: "temporary_error" }, 401);
  const body = await readObject(request);
  const token = typeof body?.token === "string" ? body.token : "";
  if (token.length < 32 || token.length > 256) return json({ status: "invalid_or_expired" }, 400);
  const result = await ctx.runMutation(internal.watchlist.verifyToken, {
    tokenHash: await createWatchlistTokenHash(token),
    now: Date.now(),
  });
  return json({ status: result });
});

const unsubscribe = httpAction(async (ctx, request) => {
  const config = readConfig();
  if (config === null) return json({ status: "configuration_unavailable" }, 503);
  if (!isAuthorized(request, config)) return json({ status: "temporary_error" }, 401);
  const body = await readObject(request);
  const token = typeof body?.token === "string" ? body.token : "";
  if (token.length >= 32 && token.length <= 256) {
    await ctx.runMutation(internal.watchlist.unsubscribeToken, {
      tokenHash: await createWatchlistTokenHash(token),
      now: Date.now(),
    });
  }
  return json({ status: "accepted" });
});

const http = httpRouter();
http.route({ path: "/watchlist/subscribe", method: "POST", handler: subscribe });
http.route({ path: "/watchlist/verify", method: "POST", handler: verify });
http.route({ path: "/watchlist/unsubscribe", method: "POST", handler: unsubscribe });

export default http;
