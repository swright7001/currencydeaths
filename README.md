# CurrencyDeaths

CurrencyDeaths is a standalone educational monetary-history and purchasing-power research project. It will document failed, replaced, redenominated, and historical currencies while keeping sourced facts, derived metrics, development fixtures, and editorial interpretation visibly distinct.

The current repository contains only the application foundation. It does not publish historical claims, live financial data, a dollar stress score, or a collapse prediction.

## Approved MVP stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Convex for future database and backend functions
- Vercel for future hosting
- Resend for a future unauthenticated watchlist
- GitHub and Linear for source control and project management

Clerk, Stripe, third-party analytics, and automated financial alerts are intentionally deferred.

## Local development

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
