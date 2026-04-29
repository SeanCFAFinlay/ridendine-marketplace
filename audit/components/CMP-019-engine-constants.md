---
id: CMP-019
name: EngineConstants
layer: Config
subsystem: Engine
path: packages/engine/src/constants.ts
language: TypeScript
loc: 104
---

# [[CMP-019]] EngineConstants

## Responsibility
Centralises all engine-level constants including fee rates, status enums, and configuration defaults.

## Public API
- `PLATFORM_FEE_PERCENT: number` — platform fee rate
- `SERVICE_FEE_PERCENT: number` — service fee rate
- `HST_RATE: number` — tax rate
- `BASE_DELIVERY_FEE: number` — base delivery fee
- `DRIVER_PAYOUT_PERCENT: number` — driver payout rate
- Various status enums and timeout constants

## Depends on (outbound)
- None

## Depended on by (inbound)
- [[CMP-006]] OrderOrchestrator — fee calculation
- Other orchestrators referencing status/timeout constants

## Reads config
- Environment variables with fallback defaults

## Side effects
- None

## Tests
- Present (test file exists)

## Smells / notes
- None identified

## Source
`packages/engine/src/constants.ts` (lines 1–104)
