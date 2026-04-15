import { injectable, inject } from 'inversify';
import pino from 'pino';
import type { Logger, ConfigProvider } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';

/**
 * Pino-based logger implementation.
 */
@injectable()
export class PinoLogger implements Logger {
  private readonly pinoInstance: pino.Logger;

  constructor(@inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider) {
    const level = configProvider.getOptional('AGENT_LOG_LEVEL') ?? 'info';
    this.pinoInstance = pino({ level });
  }

  /** @internal Constructor for child logger instances. */
  private static fromInstance(instance: pino.Logger): PinoLogger {
    const logger = Object.create(PinoLogger.prototype) as PinoLogger;
    (logger as unknown as { pinoInstance: pino.Logger }).pinoInstance = instance;
    return logger;
  }

  /** Logs a debug-level message. */
  public debug(message: string, context?: Record<string, unknown>): void {
    this.pinoInstance.debug(context ?? {}, message);
  }

  /** Logs an info-level message. */
  public info(message: string, context?: Record<string, unknown>): void {
    this.pinoInstance.info(context ?? {}, message);
  }

  /** Logs a warn-level message. */
  public warn(message: string, context?: Record<string, unknown>): void {
    this.pinoInstance.warn(context ?? {}, message);
  }

  /** Logs an error-level message. */
  public error(message: string, context?: Record<string, unknown>): void {
    this.pinoInstance.error(context ?? {}, message);
  }

  /** Creates a child logger with additional context. */
  public child(context: Record<string, unknown>): Logger {
    const childInstance = this.pinoInstance.child(context);
    return PinoLogger.fromInstance(childInstance);
  }
}

