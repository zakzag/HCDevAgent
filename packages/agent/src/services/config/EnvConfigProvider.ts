import { injectable } from 'inversify';
import type { ConfigProvider } from '@hcdevagent/shared';
import { ConfigError } from '@hcdevagent/shared';

/**
 * Loads configuration values from environment variables.
 */
@injectable()
export class EnvConfigProvider implements ConfigProvider {
  /** Returns a required configuration value. Throws ConfigError if missing. */
  public getRequired(key: string): string {
    const value = process.env[key];
    if (value === undefined || value === '') {
      throw new ConfigError(`Missing required config key: ${key}`, { key });
    }
    return value;
  }

  /** Returns an optional configuration value, or undefined if not set. */
  public getOptional(key: string): string | undefined {
    return process.env[key];
  }

  /** Returns a required configuration value as a number. Throws if missing or non-numeric. */
  public getRequiredNumber(key: string): number {
    const raw = this.getRequired(key);
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      throw new ConfigError(`Config key "${key}" is not a valid number`, { key, value: raw });
    }
    return parsed;
  }

  /** Returns an optional configuration value as a number, or undefined. */
  public getOptionalNumber(key: string): number | undefined {
    const raw = this.getOptional(key);
    if (raw === undefined) {
      return undefined;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    return parsed;
  }
}

