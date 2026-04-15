/**
 * Provides configuration values to the application.
 */
export interface ConfigProvider {
  /** Returns a required configuration value. Throws if missing. */
  getRequired(key: string): string;

  /** Returns an optional configuration value, or undefined if not set. */
  getOptional(key: string): string | undefined;

  /** Returns a configuration value as a number. Throws if missing or not numeric. */
  getRequiredNumber(key: string): number;

  /** Returns an optional configuration value as a number. */
  getOptionalNumber(key: string): number | undefined;
}

