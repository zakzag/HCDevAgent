import type { AiModelRole } from '@hcdevagent/shared';

/** Maps each AI role to its optional environment-variable model override. */
export const AI_ROLE_MODEL_ENV_KEYS: Readonly<Record<AiModelRole, string>> = {
    investigation: 'AI_MODEL_INVESTIGATION',
    planning: 'AI_MODEL_PLANNING',
    implementation: 'AI_MODEL_IMPLEMENTATION',
    commentSummary: 'AI_MODEL_COMMENT_SUMMARY',
    descriptionForAi: 'AI_MODEL_DESCRIPTION_FOR_AI',
};

