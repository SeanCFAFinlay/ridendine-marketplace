# Deployment Vercel Env Audit
| App | Vercel Project | Domain | Build Command | Env Needed | Current Risk | Required Fix |
| --- | --- | --- | --- | --- | --- | --- |
| Customer Web | UNKNOWN from repo scan | UNKNOWN from repo scan | pnpm --filter @ridendine/web build | Supabase, Stripe, app URLs, Sentry as applicable; values not printed | Project/domain/env mapping not proven by repo files | Document Vercel project IDs/domains/env matrix and add smoke tests |
| Chef Admin | UNKNOWN from repo scan | UNKNOWN from repo scan | pnpm --filter @ridendine/chef-admin build | Supabase, Stripe, app URLs, Sentry as applicable; values not printed | Project/domain/env mapping not proven by repo files | Document Vercel project IDs/domains/env matrix and add smoke tests |
| Driver App | UNKNOWN from repo scan | UNKNOWN from repo scan | pnpm --filter @ridendine/driver-app build | Supabase, Stripe, app URLs, Sentry as applicable; values not printed | Project/domain/env mapping not proven by repo files | Document Vercel project IDs/domains/env matrix and add smoke tests |
| Ops Admin | UNKNOWN from repo scan | UNKNOWN from repo scan | pnpm --filter @ridendine/ops-admin build | Supabase, Stripe, app URLs, Sentry as applicable; values not printed | Project/domain/env mapping not proven by repo files | Document Vercel project IDs/domains/env matrix and add smoke tests |

## Evidence
- Root scripts: [package.json](../../package.json)
- Deployment docs: [docs/RUNBOOK_DEPLOY.md](../../docs/RUNBOOK_DEPLOY.md)<br>[docs/STAGING_WORKFLOW.md](../../docs/STAGING_WORKFLOW.md)<br>[docs/ENVIRONMENT_VARIABLES.md](../../docs/ENVIRONMENT_VARIABLES.md)<br>[.vercelignore](../../.vercelignore)
