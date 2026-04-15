/**
 * Logger abstraction for structured logging.
 */
export interface Logger {
  /** Logs a debug-level message. */
  debug(message: string, context?: Record<string, unknown>): void;

  /** Logs an info-level message. */
  info(message: string, context?: Record<string, unknown>): void;

  /** Logs a warn-level message. */
  warn(message: string, context?: Record<string, unknown>): void;

  /** Logs an error-level message. */
  error(message: string, context?: Record<string, unknown>): void;

  /** Creates a child logger with additional context. */
  child(context: Record<string, unknown>): Logger;
}

