import { BaseError } from './BaseError.js';

/**
 * Thrown when a required configuration value is missing or invalid.
 */
export class ConfigError extends BaseError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, context);
  }
}

