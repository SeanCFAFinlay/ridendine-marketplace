---
id: CMP-048
name: Logger
layer: Util
subsystem: Utils
path: packages/utils/src/logger.ts
language: TypeScript
loc: 84
---

# [[CMP-048]] Logger

## Responsibility
Provides structured logging with log level support and context enrichment for all packages and apps.

## Public API
- `logger.info(message, context?) -> void` — info level log
- `logger.warn(message, context?) -> void` — warning level log
- `logger.error(message, error?, context?) -> void` — error level log
- `logger.debug(message, context?) -> void` — debug level log
- `createLogger(namespace) -> Logger` — creates namespaced logger instance

## Depends on (outbound)
- None

## Depended on by (inbound)
- All packages and app server code

## Reads config
- `LOG_LEVEL` — controls verbosity

## Side effects
- stdout/stderr writes

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/utils/src/logger.ts` (lines 1–84)
