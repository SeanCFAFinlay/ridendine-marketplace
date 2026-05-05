---
id: FND-011
category: TestGap
severity: High
effort: M
---

# [[FND-011]] No CI/CD pipeline

## Summary
INFERRED: No GitHub Actions workflow files found. Build verification, type checking, linting, and testing are manual-only processes.

## Affected components
- All

## Evidence
- `.github/workflows/` directory — no workflow YAML files detected

## Why this matters
Without CI, broken builds and type errors can be merged undetected. Test regressions go uncaught until someone manually runs tests.

## Proposed fix
Create `.github/workflows/ci.yml` with: typecheck, lint, test, and build steps.
