# RIDENDINE Vercel Project Map

RIDENDINE must be deployed as four separate Vercel projects. Do not deploy the repository root as a single production project.

## Required project mapping

| Vercel project | Repo root directory | Production domain | App purpose |
| --- | --- | --- | --- |
| `ridendine-web` | `apps/web` | `ridendine.ca` | Customer marketplace |
| `ridendine-chef-admin` | `apps/chef-admin` | `chef.ridendine.ca` | Chef dashboard |
| `ridendine-ops-admin` | `apps/ops-admin` | `ops.ridendine.ca` | Operations control plane |
| `ridendine-driver-app` | `apps/driver-app` | `driver.ridendine.ca` | Driver execution app |

## Required settings for each project

- Framework preset: `Next.js`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Root directory: the app directory listed above
- Do not set `BYPASS_AUTH=true` in production

## Required domain bindings

- `ridendine.ca` -> `ridendine-web`
- `www.ridendine.ca` -> `ridendine-web`
- `chef.ridendine.ca` -> `ridendine-chef-admin`
- `ops.ridendine.ca` -> `ridendine-ops-admin`
- `driver.ridendine.ca` -> `ridendine-driver-app`

## Production safety notes

- A root-level `vercel.json` must not exist for this monorepo. It makes root deployments ambiguous and can pin the entire repo to one app.
- Each app now has its own `vercel.json`. Vercel should read the file inside the configured project root directory.
- The dashboard apps intentionally redirect `/` to `/dashboard`, but middleware must handle auth before that redirect in production.
