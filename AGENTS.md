<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CurrencyDeaths agent instructions

## Purpose

CurrencyDeaths is a standalone educational monetary-history and purchasing-power research product. It is not part of Denominated or any other repository. Provocative framing must never blur the distinction between sourced facts, derived calculations, development fixtures, and interpretation.

## Approved architecture and stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Convex for the future database and backend function boundary
- Vercel for future hosting and Resend for the future email watchlist
- Server Components by default; isolate Client Components to interaction
- Pure domain logic under `lib/`; persistence code under `convex/`; reusable UI under `components/`
- npm is the package manager and `package-lock.json` is authoritative

Do not add Clerk, Stripe, analytics, a component framework, a chart library, or another service unless an approved Linear issue explicitly requires it. Use a chart dependency only after documenting why native HTML, CSS, or SVG is insufficient.

## Coding conventions

- Keep TypeScript strict and prefer explicit domain types at module boundaries.
- Preserve missing and historically imprecise data; never coerce unknown values to zero or invent date precision.
- Keep calculations out of React components and make them deterministic and testable.
- Prefer semantic HTML, accessible names, keyboard operation, visible focus, sufficient contrast, and reduced-motion support.
- Avoid unnecessary client-side JavaScript, dependencies, effects, and broad refactors.
- Never commit secrets, raw subscriber tokens, generated credentials, or production data exports.

## Testing and verification

Meaningfully test calculations, validation, transformations, permissions, integrations, and user-visible behavior. Do not spend effort testing trivial presentational markup.

Every review-ready change must pass:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

UI work additionally requires desktop and mobile evidence, keyboard review, sufficient contrast, reduced-motion behavior, and comparison with the approved reference.

## Personal Agent Loop

Work on one explicitly approved Linear issue at a time:

1. SPEC: record observable `AC-N` criteria, binding `NG-N` non-goals, dependencies, verification, risks, deployment, and rollback in Linear.
2. BUILD: claim the approved issue and implement the smallest complete change.
3. VERIFY: run the relevant quality gate and record proof for the exact commit.
4. INDEPENDENT REVIEW: a reviewer other than the builder evaluates the exact commit and returns `APPROVE` or `CHANGES REQUIRED`.
5. USER APPROVAL: present the diff, evidence, review result, and known limitations. Wait for explicit approval.
6. MERGE: never merge before explicit owner approval.
7. DEPLOY: preview deployment may be issue-scoped; production deployment always requires separate explicit approval.

The builder never approves, merges, or deploys its own work.

## Owner-only boundaries

Do not proceed without explicit approval for:

- production merge or deployment
- external project, account, domain, or paid-resource creation
- credential or secret access
- production data import, deletion, or destructive migration
- initial Dollar Stress Score weights, thresholds, or countdown semantics
- adding Clerk, Stripe, analytics, automated alerts, or a new primary dependency

When approval is unavailable, document the decision, risk, and reversible alternative in Linear and stop at the boundary.
