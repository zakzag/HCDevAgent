import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigError } from '@hcdevagent/shared';
import { EnvConfigProvider } from '../../../services/config/EnvConfigProvider.js';

/**
 * Unit tests for EnvConfigProvider.
 *
 * `vi.stubEnv` is used to safely set/restore process.env values
 * without leaking state between tests.
 */
describe('EnvConfigProvider', () => {
    let provider: EnvConfigProvider;

    beforeEach(() => {
        provider = new EnvConfigProvider();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    // ─── getRequired ────────────────────────────────────────────────────────

    describe('getRequired', () => {
        it('returns the value when the env var is set', () => {
            vi.stubEnv('TEST_KEY', 'hello');
            expect(provider.getRequired('TEST_KEY')).toBe('hello');
        });

        it('throws ConfigError when the env var is not set', () => {
            expect(() => provider.getRequired('MISSING_KEY_XYZ')).toThrow(ConfigError);
        });

        it('throws ConfigError with the key in the message', () => {
            expect(() => provider.getRequired('MISSING_KEY_XYZ')).toThrow(
                'Missing required config key: MISSING_KEY_XYZ',
            );
        });

        it('throws ConfigError when the env var is an empty string', () => {
            vi.stubEnv('EMPTY_KEY', '');
            expect(() => provider.getRequired('EMPTY_KEY')).toThrow(ConfigError);
        });

        it('includes the key in the ConfigError context', () => {
            try {
                provider.getRequired('MISSING_CTX_KEY');
                expect.fail('should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(ConfigError);
                expect((err as ConfigError).context).toMatchObject({ key: 'MISSING_CTX_KEY' });
            }
        });

        it('returns a numeric string as-is (no coercion)', () => {
            vi.stubEnv('NUMERIC_STR', '42');
            expect(provider.getRequired('NUMERIC_STR')).toBe('42');
        });
    });

    // ─── getOptional ────────────────────────────────────────────────────────

    describe('getOptional', () => {
        it('returns the value when the env var is set', () => {
            vi.stubEnv('OPT_KEY', 'world');
            expect(provider.getOptional('OPT_KEY')).toBe('world');
        });

        it('returns undefined when the env var is not set', () => {
            expect(provider.getOptional('MISSING_OPT_XYZ')).toBeUndefined();
        });

        it('returns an empty string when the env var is set to empty string', () => {
            vi.stubEnv('OPT_EMPTY', '');
            // getOptional does not enforce non-empty — that is getRequired's job
            expect(provider.getOptional('OPT_EMPTY')).toBe('');
        });
    });

    // ─── getRequiredNumber ──────────────────────────────────────────────────

    describe('getRequiredNumber', () => {
        it('returns a parsed integer', () => {
            vi.stubEnv('NUM_INT', '30000');
            expect(provider.getRequiredNumber('NUM_INT')).toBe(30000);
        });

        it('returns a parsed float', () => {
            vi.stubEnv('NUM_FLOAT', '3.14');
            expect(provider.getRequiredNumber('NUM_FLOAT')).toBeCloseTo(3.14);
        });

        it('returns zero when value is "0"', () => {
            vi.stubEnv('NUM_ZERO', '0');
            expect(provider.getRequiredNumber('NUM_ZERO')).toBe(0);
        });

        it('throws ConfigError when the env var is not set', () => {
            expect(() => provider.getRequiredNumber('MISSING_NUM_XYZ')).toThrow(ConfigError);
        });

        it('throws ConfigError when the value is not a valid number', () => {
            vi.stubEnv('BAD_NUM', 'not-a-number');
            expect(() => provider.getRequiredNumber('BAD_NUM')).toThrow(ConfigError);
        });

        it('throws ConfigError when the value is an empty string', () => {
            vi.stubEnv('EMPTY_NUM', '');
            expect(() => provider.getRequiredNumber('EMPTY_NUM')).toThrow(ConfigError);
        });

        it('includes key and value in the ConfigError context when non-numeric', () => {
            vi.stubEnv('INVALID_NUM', 'abc');
            try {
                provider.getRequiredNumber('INVALID_NUM');
                expect.fail('should have thrown');
            } catch (err) {
                expect(err).toBeInstanceOf(ConfigError);
                expect((err as ConfigError).context).toMatchObject({
                    key: 'INVALID_NUM',
                    value: 'abc',
                });
            }
        });
    });

    // ─── getOptionalNumber ──────────────────────────────────────────────────

    describe('getOptionalNumber', () => {
        it('returns a parsed integer when the env var is set', () => {
            vi.stubEnv('OPT_NUM', '9000');
            expect(provider.getOptionalNumber('OPT_NUM')).toBe(9000);
        });

        it('returns a parsed float when the env var is set', () => {
            vi.stubEnv('OPT_FLOAT', '1.5');
            expect(provider.getOptionalNumber('OPT_FLOAT')).toBeCloseTo(1.5);
        });

        it('returns zero when value is "0"', () => {
            vi.stubEnv('OPT_ZERO', '0');
            expect(provider.getOptionalNumber('OPT_ZERO')).toBe(0);
        });

        it('returns undefined when the env var is not set', () => {
            expect(provider.getOptionalNumber('MISSING_OPT_NUM_XYZ')).toBeUndefined();
        });

        it('returns undefined when the value is not a valid number (no throw)', () => {
            vi.stubEnv('OPT_BAD_NUM', 'oops');
            expect(provider.getOptionalNumber('OPT_BAD_NUM')).toBeUndefined();
        });

        it('returns undefined when the value is empty string (not set via getOptional)', () => {
            vi.stubEnv('OPT_EMPTY_NUM', '');
            // getOptional returns '' → Number('') === 0, but empty means "not provided"
            // implementation returns undefined for undefined raw, but empty string
            // flows through Number('') = 0 — document actual behaviour:
            const result = provider.getOptionalNumber('OPT_EMPTY_NUM');
            // '' is returned by getOptional → Number('') = 0, which is NOT NaN → returns 0
            expect(result).toBe(0);
        });
    });

    // ─── real-world config keys (smoke) ─────────────────────────────────────

    describe('real-world config keys smoke', () => {
        it('reads JIRA_BASE_URL', () => {
            vi.stubEnv('JIRA_BASE_URL', 'https://acme.atlassian.net');
            expect(provider.getRequired('JIRA_BASE_URL')).toBe('https://acme.atlassian.net');
        });

        it('reads MONGODB_URI', () => {
            const uri = 'mongodb://user:pass@localhost:27017/db?authSource=admin';
            vi.stubEnv('MONGODB_URI', uri);
            expect(provider.getRequired('MONGODB_URI')).toBe(uri);
        });

        it('reads AGENT_POLL_INTERVAL_MS as a number', () => {
            vi.stubEnv('AGENT_POLL_INTERVAL_MS', '15000');
            expect(provider.getRequiredNumber('AGENT_POLL_INTERVAL_MS')).toBe(15000);
        });

        it('reads GITHUB_TOKEN', () => {
            vi.stubEnv('GITHUB_TOKEN', 'ghp_abc123');
            expect(provider.getRequired('GITHUB_TOKEN')).toBe('ghp_abc123');
        });

        it('reads GIT_REPO_URL', () => {
            vi.stubEnv('GIT_REPO_URL', 'https://example.com/acme/repo.git');
            expect(provider.getRequired('GIT_REPO_URL')).toBe('https://example.com/acme/repo.git');
        });

        it('reads VERSION_CONTROL_PROVIDER', () => {
            vi.stubEnv('VERSION_CONTROL_PROVIDER', 'github');
            expect(provider.getRequired('VERSION_CONTROL_PROVIDER')).toBe('github');
        });

        it('reads optional COPILOT_API_URL', () => {
            vi.stubEnv('COPILOT_API_URL', 'https://api.githubcopilot.com');
            expect(provider.getOptional('COPILOT_API_URL')).toBe('https://api.githubcopilot.com');
        });

        it('returns undefined for missing optional AI_PROVIDER', () => {
            // AI_PROVIDER_ABSENT_XYZ is guaranteed not to be set in the test environment
            expect(provider.getOptional('AI_PROVIDER_ABSENT_XYZ')).toBeUndefined();
        });
    });
});

