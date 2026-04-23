// ==========================================
// STRUCTURED LOGGER
// JSON-structured log output for observability.
// Drop-in replacement for console.log/error.
// ==========================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  app?: string;
  route?: string;
  method?: string;
  actor?: string;
  orderId?: string;
  deliveryId?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: { name: string; message: string; stack?: string };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: LogContext, err?: unknown): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };

  if (err) {
    if (err instanceof Error) {
      entry.error = { name: err.name, message: err.message, stack: err.stack };
    } else {
      entry.error = { name: 'Unknown', message: String(err) };
    }
  }

  const output = formatEntry(entry);
  if (level === 'error' || level === 'warn') {
    console.error(output);
  } else {
    console.log(output);
  }
}

export function createLogger(defaultContext: LogContext) {
  return {
    debug: (message: string, ctx?: LogContext) => log('debug', message, { ...defaultContext, ...ctx }),
    info: (message: string, ctx?: LogContext) => log('info', message, { ...defaultContext, ...ctx }),
    warn: (message: string, ctx?: LogContext, err?: unknown) => log('warn', message, { ...defaultContext, ...ctx }, err),
    error: (message: string, ctx?: LogContext, err?: unknown) => log('error', message, { ...defaultContext, ...ctx }, err),
  };
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext, err?: unknown) => log('warn', message, context, err),
  error: (message: string, context?: LogContext, err?: unknown) => log('error', message, context, err),
};
