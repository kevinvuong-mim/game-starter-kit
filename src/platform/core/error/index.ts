import { getEnvironment } from '../config';

export type LogLevel = 'info' | 'warn' | 'debug' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  info: 1,
  warn: 2,
  debug: 0,
  error: 3,
};

export class Logger {
  private context: string;
  private minLevel: LogLevel;

  constructor(context = 'Platform', minLevel?: LogLevel) {
    this.context = context;
    this.minLevel = minLevel ?? (getEnvironment() === 'production' ? 'warn' : 'debug');
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.minLevel);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, args);
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    this.log('error', message, [error, ...args]);
  }

  private log(level: LogLevel, message: string, args: unknown[]): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) return;

    const prefix = `[${this.context}]`;
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`${prefix} ${message}`, ...args);
  }
}

export const logger = new Logger('Platform');

export interface CrashReport {
  stack?: string;
  message: string;
  context?: string;
  timestamp: number;
  userAgent?: string;
}

export type CrashReporter = (report: CrashReport) => void | Promise<void>;

const crashReporters: CrashReporter[] = [];

export function registerCrashReporter(reporter: CrashReporter): () => void {
  crashReporters.push(reporter);
  return () => {
    const idx = crashReporters.indexOf(reporter);
    if (idx >= 0) crashReporters.splice(idx, 1);
  };
}

export async function reportCrash(error: Error, context?: string): Promise<void> {
  const report: CrashReport = {
    context,
    stack: error.stack,
    timestamp: Date.now(),
    message: error.message,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  logger.error('Crash reported', error, { context });

  for (const reporter of crashReporters) {
    try {
      await reporter(report);
    } catch (e) {
      logger.error('Crash reporter failed', e);
    }
  }
}

export class ErrorBoundary {
  private handlers: Array<(error: Error, context: string) => void> = [];

  onError(handler: (error: Error, context: string) => void): () => void {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) this.handlers.splice(idx, 1);
    };
  }

  capture(error: unknown, context = 'unknown'): void {
    const err = error instanceof Error ? error : new Error(String(error));

    for (const handler of this.handlers) {
      try {
        handler(err, context);
      } catch (e) {
        logger.error('Error boundary handler failed', e);
      }
    }

    void reportCrash(err, context);
  }

  wrap<T extends (...args: unknown[]) => unknown>(fn: T, context: string): T {
    return ((...args: unknown[]) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch((e) => {
            this.capture(e, context);
            throw e;
          });
        }
        return result;
      } catch (e) {
        this.capture(e, context);
        throw e;
      }
    }) as T;
  }
}

export const errorBoundary = new ErrorBoundary();

export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    errorBoundary.capture(event.error ?? event.message, 'window.error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorBoundary.capture(event.reason, 'unhandledrejection');
  });
}
