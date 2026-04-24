import type { AiCompletionOptions, Logger } from '@hcdevagent/shared';
import {
    AI_REQUEST_DEFAULT_MODEL_LABEL,
    AI_REQUEST_MODEL_SELECTED_MESSAGE,
} from './constants/aiLogging.constants.js';

interface LogSelectedAiModelInput {
    readonly logger: Logger;
    readonly provider: 'openai' | 'github-models' | 'copilot-cli';
    readonly model: string | undefined;
    readonly role: AiCompletionOptions['role'];
}

/**
 * Emits a consistent, operator-visible summary of the AI provider/model chosen
 * for one logical request.
 */
export const logSelectedAiModel = (input: LogSelectedAiModelInput): void => {
    input.logger.info(AI_REQUEST_MODEL_SELECTED_MESSAGE, {
        provider: input.provider,
        model: input.model ?? AI_REQUEST_DEFAULT_MODEL_LABEL,
        role: input.role,
    });
};
