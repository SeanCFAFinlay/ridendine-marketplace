# PR Remote Checks Diagnostic Report

## Executive Summary

Remote PR checks are failing and need diagnosis before continuing Phase F.

This report was generated from PowerShell diagnostics.

## Local Git State

| Field | Value |
|---|---|
| Branch | `ridendine-prelaunch-repair-checkpoint` |
| Latest commit | `99ad1c9 chore: remove graphify cache from checkpoint` |
| Diagnostic folder | `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks` |

## GitHub Actions

Latest failed run ID detected:

`25212161045`

Files generated:

- `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\gh-run-list.txt`
- `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\gh-run-25212161045-log-failed.txt`
- `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\gh-run-25212161045-summary.json`

## Vercel Deployments Checked

| App | Deployment ID | Log file |
|---|---|---|
| ridendine-chef-admin | dpl_HjYSCj6KtTSUVYdZePRVCmkKiMtc | `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\vercel-ridendine-chef-admin-dpl_HjYSCj6KtTSUVYdZePRVCmkKiMtc.log` |
| ridendine-driver-app | dpl_D4hYhpP9qR6dQqj9KWPUT75xana9 | `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\vercel-ridendine-driver-app-dpl_D4hYhpP9qR6dQqj9KWPUT75xana9.log` |
| ridendine-ops-admin | dpl_8BkkBvvesAXCfpL9yW1obHMF7JU7 | `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\vercel-ridendine-ops-admin-dpl_8BkkBvvesAXCfpL9yW1obHMF7JU7.log` |
| ridendine-web | dpl_Fced4z4ZfS6i5tB3rvznxPHT3hAr | `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\vercel-ridendine-web-dpl_Fced4z4ZfS6i5tB3rvznxPHT3hAr.log` |

## Local Verification Logs

- `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\local-pnpm-typecheck.log`
- `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\local-pnpm-lint.log`
- `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\local-pnpm-test.log`
- `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\local-pnpm-build.log`
- `AUDIT_AND_PLANNING\PRE_LAUNCH_REPAIR_EXECUTION_01\remote-checks\local-pnpm-test-smoke.log`

## Next Step

Open the generated logs and identify the first real error from:

1. GitHub Actions failed log
2. Each Vercel deployment log

Do not continue Phase F until CI/Vercel blockers are fixed or confirmed as external configuration issues.

