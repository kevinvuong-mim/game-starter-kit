import { getEnvironment } from '../config';

type LogLevel = 'info' | 'warn' | 'debug' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  info: 1,
  warn: 2,
  debug: 0,
  error: 3,
};

class Logger {
  private context: string;
  private minLevel: LogLevel;

  constructor(context = 'Platform', minLevel?: LogLevel) {
    this.context = context;
    this.minLevel = minLevel ?? (getEnvironment() === 'production' ? 'warn' : 'debug');
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

async function reportCrash(error: Error, context?: string): Promise<void> {
  logger.error('Crash reported', error, { context });
}

class ErrorBoundary {
  capture(error: unknown, context = 'unknown'): void {
    const err = error instanceof Error ? error : new Error(String(error));
    void reportCrash(err, context);
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
