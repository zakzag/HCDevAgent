import type { AiCompletionOptions, AiModelRole, ConfigProvider } from '@hcdevagent/shared';

/** Maps each AI role to its optional environment-variable model override. */
export const AI_ROLE_MODEL_ENV_KEYS: Readonly<Record<AiModelRole, string>> = {
    investigation: 'AI_MODEL_INVESTIGATION',
    planning: 'AI_MODEL_PLANNING',
    implementation: 'AI_MODEL_IMPLEMENTATION',
    commentSummary: 'AI_MODEL_COMMENT_SUMMARY',
    descriptionForAi: 'AI_MODEL_DESCRIPTION_FOR_AI',
};

const normalizeModel = (value: string | undefined): string | undefined => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
};

/**
 * Resolves the model to use for one AI request.
 * Precedence: explicit per-request model -> role-specific env override -> fallback model.
 */
export class AiModelSelector {
    public constructor(private readonly configProvider: ConfigProvider) {}

    public resolveModel(fallbackModel: string | undefined, options?: AiCompletionOptions): string | undefined {
        const explicitModel = normalizeModel(options?.model);
        if (explicitModel !== undefined) {
            return explicitModel;
        }

        const role = options?.role;
        if (role !== undefined) {
            const envKey = AI_ROLE_MODEL_ENV_KEYS[role];
            const roleModel = normalizeModel(this.configProvider.getOptional(envKey));
            if (roleModel !== undefined) {
                return roleModel;
            }
        }

        return normalizeModel(fallbackModel);
    }
}

