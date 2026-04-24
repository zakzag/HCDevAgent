import type { AiCompletionOptions, ConfigProvider } from '@hcdevagent/shared';
import { AI_ROLE_MODEL_ENV_KEYS } from './constants/aiModelSelector.constants.js';

export { AI_ROLE_MODEL_ENV_KEYS } from './constants/aiModelSelector.constants.js';

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
