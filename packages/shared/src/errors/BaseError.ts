/**
 * Base error class for all custom application errors.
 * Provides a consistent error interface with error name and optional context.
 */
export class BaseError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

