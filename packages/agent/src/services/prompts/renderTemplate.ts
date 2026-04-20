import { ConfigError } from '@hcdevagent/shared';

/**
 * Replaces all `${variableName}` placeholders in `template` with the
 * corresponding value from `variables`.
 *
 * @throws {ConfigError} when a placeholder has no matching key in `variables`.
 *
 * @example
 * ```ts
 * renderTemplate('Hello, ${name}!', { name: 'World' }); // 'Hello, World!'
 * ```
 */
export const renderTemplate = (template: string, variables: Record<string, string>): string =>
    template.replace(/\$\{([^}]+)\}/g, (_match, key: string) => {
        if (!(key in variables)) {
            throw new ConfigError(`Unresolved prompt placeholder: \${${key}}`, { key });
        }
        return variables[key];
    });

