import { BaseError } from './BaseError.js';

/**
 * Error thrown when a method is not yet implemented.
 * Used as a placeholder for future implementations.
 */
export class NotImplementedError extends BaseError {
    constructor(methodName: string, context: Record<string, unknown> = {}) {
        super(`Method "${methodName}" is not yet implemented`, { methodName, ...context });
    }
}

