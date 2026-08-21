# Vercel Git preview policy

CurrencyDeaths permits automatic Vercel deployments from non-production Git branches only. A push or merge to `main` must not create or promote a Production deployment.

## Versioned control

The repository-level [`vercel.json`](../vercel.json) sets:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": false
    }
  }
}
```

Vercel documents that unspecified branches default to enabled, while a branch mapped to `false` does not trigger a deployment. Therefore:

- non-`main` pull-request branches may create Preview deployments;
- `main` does not create a Git-triggered deployment;
- production remains a separate manual Personal Agent Loop action with a fresh Discord approval;
- this policy does not authorize promotion, aliases, domains, secrets, or spending.

Authoritative references:

- [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration)
- [Deploying Git repositories with Vercel](https://vercel.com/docs/git)
- [Vercel deployment environments](https://vercel.com/docs/deployments/environments)

## Provider activation boundary

The presence of `vercel.json` does not connect a repository or create a deployment. Connecting the existing Vercel project to GitHub is a distinct external-provider mutation and requires its own single-use Discord Approve/Deny decision.

Before activation, verify all of the following:

1. the exact existing project ID and GitHub repository;
2. the local ignored `.vercel/project.json` points to that project rather than a deleted predecessor;
3. the project has no existing Git link;
4. the current Production deployment and aliases are inventoried;
5. the reviewed pull-request commit contains this policy.

After activation, verify a non-`main` branch creates a Preview deployment with exact commit provenance. When this policy reaches `main`, verify no new Production deployment exists and the previously approved Production deployment and aliases remain unchanged.

## Preview retention and rollback

Keep only the Preview deployment required as review evidence. Remove unintended test deployments. If configuration, provenance, environment classification, protection, URLs, cost, or the production boundary differs from the approved packet, disconnect the Git integration, remove newly created Preview state, and verify the recorded provider baseline is restored.

Disconnecting Git is the provider rollback. Reverting `vercel.json` is a separate source change and must follow the normal review and merge loop.
