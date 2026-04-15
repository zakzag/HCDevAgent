import { BaseError } from './BaseError.js';

/**
 * Thrown when code implementation fails during the implementation phase.
 */
export class ImplementationError extends BaseError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, context);
  }
}

