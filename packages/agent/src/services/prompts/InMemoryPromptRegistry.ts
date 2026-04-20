import { injectable } from 'inversify';
import type { PromptRegistry, PromptKey, PromptVariables } from '@hcdevagent/shared';
import { ConfigError } from '@hcdevagent/shared';
import { renderTemplate } from './renderTemplate.js';
import { investigationPrompts } from './templates/investigation.prompts.js';
import { planningPrompts } from './templates/planning.prompts.js';
import { implementationPrompts } from './templates/implementation.prompts.js';

/**
 * In-memory implementation of PromptRegistry.
 * Merges all domain template maps at construction time and resolves
 * `${placeholder}` tokens in templates on each `getPrompt` call.
 */
@injectable()
export class InMemoryPromptRegistry implements PromptRegistry {
    private readonly templates: ReadonlyMap<PromptKey, string>;

    public constructor() {
        this.templates = new Map<PromptKey, string>([
            ...Object.entries(investigationPrompts),
            ...Object.entries(planningPrompts),
            ...Object.entries(implementationPrompts),
        ] as Array<[PromptKey, string]>);
    }

    /**
     * Resolves a prompt template by key, substituting all `${placeholder}`
     * tokens with values from `variables`.
     *
     * @throws {ConfigError} when the key is unknown or a placeholder is unresolved.
     */
    public getPrompt<K extends PromptKey>(key: K, variables: PromptVariables[K]): string {
        const template = this.templates.get(key);
        if (template === undefined) {
            throw new ConfigError(`Unknown prompt key: "${key}"`, { key });
        }
        return renderTemplate(template, variables as Record<string, string>);
    }
}

