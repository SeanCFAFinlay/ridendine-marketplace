# Backup and rollback

Companion: [`docs/RUNBOOK_DEPLOY.md`](RUNBOOK_DEPLOY.md), [`docs/RELEASE_BASELINE.md`](RELEASE_BASELINE.md).

This document defines **approach and responsibilities**. Numbers (RPO/RTO) are **placeholders** until leadership fills them in.

---

## 1. Supabase backup approach

| Method | Use case | Notes |
|--------|-----------|-------|
| **Supabase automated backups** | Hosted project default | Depends on plan; confirm in Supabase Dashboard → Database → Backups. |
| **Point-in-time recovery (PITR)** | Paid tier / add-on | Use for logical corruption or bad migration **if** enabled for the project. |
| **Logical dump** | Schema + data export | `supabase db dump` or `pg_dump` with credentials from a secure bastion. Store artifacts in **private** storage only. |
| **Migration history** | Reproducible schema | `supabase/migrations/` in git is the **source of truth** for schema evolution, not a substitute for data backup. |

**Rule:** Before **any** production migration, confirm a **recoverable** backup exists (automated backup window + optional manual dump).

---

## 2. Migration rollback rules

| Situation | Preferred action |
|-----------|------------------|
| Migration applied, app incompatible | **Forward fix:** new migration + deploy compatible code. |
| Catastrophic migration | Restore from **PITR** or latest **backup** per Supabase runbook; coordinate with Supabase support if needed. |
| `down` migration scripts | Not assumed in this repo — avoid relying on automatic down unless every migration is paired and tested. |

**Never** “fix” production by running ad-hoc SQL without a reviewed migration file and peer review.

---

## 3. Vercel rollback

1. Open Vercel project → **Deployments**.  
2. Find last known-good production deployment.  
3. **Promote to Production** (or “Redeploy” that artifact).  
4. Verify health endpoints and one critical user journey.

Rollback **does not** roll back database state unless you execute a separate DB procedure.

---

## 4. Stripe rollback limitations

- **Charges / refunds** are governed by Stripe; redeploying the app does not undo money movement.  
- **Webhook secrets** and endpoint URLs can be reverted in the Stripe Dashboard independently of Vercel.  
- **Idempotent replay:** engine webhook path is designed for safe replay; still avoid duplicate business actions outside that path.

---

## 5. Data recovery steps (outline)

1. **Stop writes** (maintenance mode / feature flag — product decision).  
2. **Assess** last good backup timestamp vs. acceptable data loss (RPO).  
3. **Restore** Supabase from backup or PITR to a **new** branch/instance if your process requires validation before cutover.  
4. **Repoint** app `DATABASE_URL` / Supabase project only per runbook (usually not applicable for hosted Supabase single project — follow Supabase docs).  
5. **Replay** or reconcile Stripe vs. internal ledger with finance.

---

## 6. RPO / RTO placeholders

| Metric | Definition | Target (fill in) |
|--------|------------|-------------------|
| **RPO** | Max acceptable **data** loss window | _e.g. 1 hour_ — **TBD** |
| **RTO** | Max acceptable **downtime** to restore service | _e.g. 4 hours_ — **TBD** |

---

## 7. Emergency contacts (placeholders)

| Function | Contact |
|----------|---------|
| Engineering on-call | _TBD_ |
| Supabase project owner | _TBD_ |
| Finance / Stripe | _TBD_ |
| Legal / customer comms | _TBD_ |

---

## 8. Tabletop exercise (recommended)

Before production launch, walk through: *backup exists → migration fails → rollback Vercel → DB restore decision* with the team and record decisions in Phase 18 launch materials.
