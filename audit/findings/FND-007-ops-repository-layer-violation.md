---
id: FND-007
title: OpsRepository contains business logic that belongs in the engine layer
category: LayerViolation
severity: Medium
effort: M
status: Open
components: CMP-038, CMP-008, CMP-012
---

# [[FND-007]] OpsRepository Layer Violation

## Summary
[[CMP-038]] OpsRepository at 616 LOC contains driver scoring algorithms, coverage gap calculations, and dispatch queue orchestration logic that should reside in the engine layer (specifically [[CMP-008]] DispatchEngine or [[CMP-012]] OpsControlEngine). The repository layer should only perform data access, not business logic.

## Evidence
- `ops.repository.ts`: `getDriverScores()` — scores drivers using multi-factor algorithm
- `ops.repository.ts`: `getCoverageGaps()` — spatial coverage gap calculation
- `ops.repository.ts`: `getDispatchQueue()` — queue priority ordering logic
- Total: ~300 LOC of business logic in a repository file

## Impact
- Business rules are split between engine and repository; harder to test in isolation
- Driver scoring is called from repository (DB layer) rather than engine (business layer)
- Makes it harder to reuse or test the scoring algorithm without a DB connection
- Violates the project's own package boundary design decision

## Recommendation
1. Extract driver scoring into a `DriverScoringService` in the engine layer
2. Extract coverage gap calculation into [[CMP-008]] DispatchEngine or a dedicated helper
3. Keep repository methods as thin data fetchers; pass raw data to engine for processing
4. Update [[CMP-012]] OpsControlEngine to call engine-layer methods rather than repository directly for scored/processed results

## Fix Effort
M — refactor, test coverage needed after extraction.
