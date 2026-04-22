import { injectable, inject } from 'inversify';
import pino from 'pino';
 import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Logger, ConfigProvider } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';

/** Supported log transport modes. */
export type LogTransport = 'pretty' | 'file';

/** Default log file path relative to the process cwd. */
const DEFAULT_LOG_FILE = 'logs/agent.log';

/**
 * Builds a pino instance configured for pretty console output.
 * Uses pino-pretty as a transport for human-readable, colourised logs.
 */
function buildPrettyTransport(level: string): pino.Logger {
  return pino({
    level,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  });
}

/**
 * Builds a pino instance that writes newline-delimited JSON to a log file.
 * Creates the log directory if it does not already exist.
 */
function buildFileTransport(level: string, filePath: string): pino.Logger {
  const absolutePath = resolve(process.cwd(), filePath);
  mkdirSync(resolve(absolutePath, '..'), { recursive: true });
  return pino({ level }, pino.destination({ dest: absolutePath, sync: false, mkdir: true }));
}

/**
 * Pino-based logger implementation.
 * Supports two transports selected via the `LOG_TRANSPORT` env variable:
 * - `pretty`  – colourised human-readable output to stdout (default)
 * - `file`    – newline-delimited JSON written to `logs/agent.log`
 */
@injectable()
export class PinoLogger implements Logger {
  private readonly pinoInstance: pino.Logger;

  constructor(@inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider) {
    const level = configProvider.getOptional('AGENT_LOG_LEVEL') ?? 'info';
    const transport = (configProvider.getOptional('LOG_TRANSPORT') ?? 'pretty') as LogTransport;
    const logFile = configProvider.getOptional('LOG_FILE') ?? DEFAULT_LOG_FILE;

    this.pinoInstance =
      transport === 'file'
        ? buildFileTransport(level, logFile)
        : buildPrettyTransport(level);
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

  /** Logs an error-level message with optional Error object and context. */
  public error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.pinoInstance.error({ ...(context ?? {}), ...(error ? { err: error } : {}) }, message);
  }

  /** Creates a child logger with additional context. */
  public child(context: Record<string, unknown>): Logger {
    const childInstance = this.pinoInstance.child(context);
    return PinoLogger.fromInstance(childInstance);
  }
}

