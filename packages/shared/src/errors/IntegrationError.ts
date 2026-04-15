import { BaseError } from './BaseError.js';

/**
 * Thrown when an external integration (Jira, GitHub, OpenAI) fails.
 */
export class IntegrationError extends BaseError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, context);
  }
}

