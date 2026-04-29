# Security Notes

## BYPASS_AUTH Environment Variable

The `BYPASS_AUTH` env var allows skipping authentication middleware during development.

### Safety Rules
- **Never set `BYPASS_AUTH=true` in production.** The middleware will throw a fatal error if this is attempted.
- Default value: `false`
- Only affects middleware auth checks; API routes may have additional auth logic.

### Production Guard
`packages/auth/src/middleware.ts` contains a hard crash if `BYPASS_AUTH=true` and `NODE_ENV=production`. This is intentional and should not be removed.

## ENGINE_PROCESSOR_TOKEN

Used to authenticate automated processor calls (SLA timer processing, expired offer expiry).

### Rules
- Must be a cryptographically random string (min 32 hex chars)
- Must be set in ops-admin production environment
- Never expose in client-side code or NEXT_PUBLIC_ variables
- Transmitted via `x-processor-token` HTTP header

### Generation
```bash
openssl rand -hex 32
```

## Stripe Keys
- `STRIPE_SECRET_KEY` — server-side only, never prefix with NEXT_PUBLIC_
- `STRIPE_WEBHOOK_SECRET` — used to verify Stripe webhook signatures
- Both must be rotated if compromised
