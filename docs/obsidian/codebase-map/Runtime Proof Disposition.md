# Runtime Proof Disposition

Generated: 2026-10-26T11:41:46.224Z

This Phase 20/21 proof disposition audit assigns every remaining runtime proof gap to an explicit next proof action. It does not make new production calls or mutate data; it converts the remaining proof gaps into actionable buckets for future safe smoke, negative authorization, sample-data, or contract-only work.

## Summary

| Surface | Total discovered | Proof covered | Proof gaps | Dispositioned proof gaps | Unresolved |
|---|---:|---:|---:|---:|---:|
| Pages | 107 | 106 | 1 | 1 | 0 |
| API route handlers | 178 | 178 | 0 | 0 | 0 |

## Page Proof Gap Disposition

| App | Route | File | Auth intent | Next proof action | Recommended proof action |
|---|---|---|---|---|---|
| Customer Web | `/checkout` | `apps/web/src/app/checkout/page.tsx` | mixed-auth-dependent | public-shell-and-auth-action-smoke | public-shell-and-auth-action-smoke |

## API Proof Gap Disposition

| App | Endpoint | File | Guard intent | Next proof action | Recommended proof action |
|---|---|---|---|---|---|
None found.

## Failures

None found.
