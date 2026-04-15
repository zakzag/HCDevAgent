import { BaseError } from './BaseError.js';

/**
 * Thrown when a storage operation fails.
 */
export class StorageError extends BaseError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, context);
  }
}

