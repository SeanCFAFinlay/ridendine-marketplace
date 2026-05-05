---
id: FND-019
category: SecretHygiene
severity: Medium
effort: S
---

# [[FND-019]] BYPASS_AUTH env var

## Summary
A BYPASS_AUTH environment variable exists for development that skips authentication. No build-time or runtime guard prevents it from being enabled in production.

## Affected components
- [[CMP-042]] AuthMiddleware

## Evidence
- `.env.example` line 40: `BYPASS_AUTH=false`
- `packages/auth/src/middleware.ts` — reads BYPASS_AUTH

## Why this matters
If accidentally set to true in production, all authentication is bypassed. This is a critical security vulnerability waiting to happen.

## Proposed fix
Add a build-time check or runtime guard: if NODE_ENV=production and BYPASS_AUTH=true, throw an error at startup.
