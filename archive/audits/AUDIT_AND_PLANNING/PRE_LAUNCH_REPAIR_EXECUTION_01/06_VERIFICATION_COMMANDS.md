# Verification Commands

| Command | Purpose | Exit status | Summary | Failure details | Next action |
|---|---|---:|---|---|---|
| `pnpm --filter @ridendine/engine test` | Validate engine + stripe service changes | 0 | 405 tests passed | None | Keep in final gate |
| `pnpm --filter @ridendine/web test` (run 1) | Validate checkout/test updates | 1 | 1 failing test | brittle string assertion in `customer-ordering.test.ts` | Fix assertion and rerun |
| `pnpm --filter @ridendine/web test` (run 2) | Re-validate web after test fix | 0 | 52 tests passed | None | Keep in final gate |
| `pnpm --filter @ridendine/web typecheck` | Validate checkout route type safety | 0 | clean typecheck | None | Keep in final gate |
| `python3 -c \"from graphify.watch import _rebuild_code; ...\"` | Required graph rebuild after code edits | 1 | command hung and was terminated | no stdout/stderr body; process killed manually | Re-run once graphify tooling availability is confirmed |

## Phase-level command status

- Phase A targeted verification: **PASS** for engine/web test+typecheck.
- Full monorepo verification (`verify:prod-data-hygiene`, `typecheck`, `lint`, `test`, `build`) not rerun in this execution pass yet.
