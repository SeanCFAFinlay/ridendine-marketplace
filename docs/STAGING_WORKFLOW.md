# Staging & Preview Workflow

## How it works

Vercel automatically creates **Preview Deployments** for every push to a non-production branch. This means you get a staging environment for free.

## Workflow

### For features and fixes:
```bash
# Create a branch
git checkout -b feature/my-change

# Make changes, commit
git add .
git commit -m "Add my feature"

# Push branch — Vercel creates a preview deployment
git push origin feature/my-change

# Test on the preview URL (shown in Vercel dashboard or GitHub PR)
# When satisfied, create a PR to master
gh pr create --title "Add my feature"

# After review, merge to master — Vercel deploys to production
```

### For urgent hotfixes:
Push directly to master. CI runs typecheck + tests + build. Vercel auto-deploys.

## Preview URLs

Each Vercel project gets preview URLs like:
- `ridendine-web-{hash}.vercel.app`
- `ridendine-ops-admin-{hash}.vercel.app`

These use the same Supabase database as production (unless you configure separate Preview environment variables in Vercel).

## Protecting production

1. **CI runs on all PRs** — typecheck, lint, tests, build must pass
2. **Branch protection** (recommended): Go to GitHub → Settings → Branches → Add rule for `master`:
   - Require status checks: `quality`
   - Require PR reviews (optional but recommended)
3. **Vercel Preview** — test on preview URL before merging

## Environment Variables per environment

In Vercel, you can set different env vars per environment:
- **Production**: real Stripe keys, real Sentry DSN
- **Preview**: test Stripe keys, test Sentry DSN (or none)
- **Development**: local .env.local values

This means preview deployments can use test keys while production uses live keys.
