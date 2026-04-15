import { BaseError } from './BaseError.js';

/**
 * Thrown when input data fails validation.
 */
export class ValidationError extends BaseError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, context);
  }
}

