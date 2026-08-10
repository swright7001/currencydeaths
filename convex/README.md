# Convex functions

This directory is the backend boundary for CurrencyDeaths. The domain schema and production data are intentionally deferred to later approved issues.

Run `npx convex dev` from the repository root to configure an approved local deployment and regenerate `convex/_generated`. Commit generated types; do not edit them manually.

All future registered functions must use object-form syntax with argument and return validators. Use indexes for bounded read paths, default helpers to internal functions, and keep external API calls in actions.
