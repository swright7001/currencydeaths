# CurrencyDeaths

CurrencyDeaths is a standalone educational monetary-history and purchasing-power research project. It will document failed, replaced, redenominated, and historical currencies while keeping sourced facts, derived metrics, development fixtures, and editorial interpretation visibly distinct.

The current repository contains only the application foundation. It does not publish historical claims, live financial data, a dollar stress score, or a collapse prediction.

## Approved MVP stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Convex for future database and backend functions
- Vercel for future hosting
- Resend for the unauthenticated, double-opt-in research watchlist
- GitHub and Linear for source control and project management

Clerk, Stripe, third-party analytics, and automated financial alerts are intentionally deferred.

## Local development

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Search metadata, JSON-LD, the sitemap, and robots output use

`CURRENCYDEATHS_SITE_URL` as their canonical origin. Leave it unset locally for
the deterministic `http://localhost:3000` fallback. Configure it only after a
public HTTPS origin has been explicitly approved; preview URLs must not be
silently promoted to the production canonical origin.

## Local Convex setup

Convex is wired into the application but no cloud project or deployment is committed or implied. The current static placeholder runs without Convex configuration.

To configure a local development deployment when an approved issue requires backend functions:

```bash
cp .env.example .env.local
npx convex dev
```

The Convex CLI fills `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` in `.env.local`. Never commit `.env.local` or deployment credentials. Commit the generated `convex/_generated` types after running codegen; application TypeScript depends on them once functions are added.

If code requires a configured backend, use `requireConvexUrl` from `lib/env/convex.ts`. It throws a specific setup error when the URL is missing or malformed rather than connecting to a fabricated endpoint.

## Watchlist configuration

The watchlist uses a Next.js Server Action as its public boundary, authenticated Convex HTTP actions for persistence, and Resend for confirmation mail. It fails closed before storing an address when required configuration is absent. Configure these values only in approved environments:

- Next.js server: `WATCHLIST_CONVEX_SITE_URL`, `WATCHLIST_ACTION_SECRET`
- Convex: `WATCHLIST_ACTION_SECRET`, `SUBSCRIBER_HASH_SECRET`, `RESEND_API_KEY`, `WATCHLIST_FROM_EMAIL`, `WATCHLIST_PUBLIC_URL`

`WATCHLIST_ACTION_SECRET`, `SUBSCRIBER_HASH_SECRET`, and `RESEND_API_KEY` are secrets. Never prefix them with `NEXT_PUBLIC`, expose them to client components, or commit their values. `WATCHLIST_PUBLIC_URL` must be the origin used in confirmation and unsubscribe links. Provider/domain setup and live sending require separate approval.

## Required quality gate

Run every command before a pull request is ready for independent review:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Repository boundaries

- Server Components are the default; use Client Components only for required interaction.
- Keep domain calculations separate from React components and persistence code.
- Production facts and metrics require documented provenance and freshness.
- Never hard-code a collapse probability, death date, or permanent risk score.
- Do not provision external services or production deployments without explicit owner approval.

See `AGENTS.md` for the complete working agreement and Personal Agent Loop.
