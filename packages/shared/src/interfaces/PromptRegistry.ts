/**
 * All prompt keys used by the agent.
 * Each key maps to one prompt template (system or user).
 */
export type PromptKey =
    | 'investigation.system'
    | 'investigation.user'
    | 'planning.system'
    | 'planning.user'
    | 'planning.refine.system'
    | 'planning.refine.user'
    | 'implementation.system'
    | 'implementation.user'
    | 'implementation.pr-feedback.user'
    | 'implementation.clarification.user';

/** Variables for the investigation system prompt (static, no placeholders). */
export type InvestigationSystemVars = Record<never, string>;

/** Variables for the investigation user prompt. */
export interface InvestigationUserVars {
    readonly issueKey: string;
    readonly summary: string;
    readonly description: string;
    readonly status: string;
    readonly labels: string;
    /** Pre-formatted comments block, or empty string when there are no comments. */
    readonly commentsSection: string;
    /** Pre-formatted related issues block, or empty string when there are none. */
    readonly relatedIssuesSection: string;
}

/** Variables for the planning system prompt (static, no placeholders). */
export type PlanningSystemVars = Record<never, string>;

/** Variables for the planning user prompt. */
export interface PlanningUserVars {
    readonly descriptionForAi: string;
    /** Pre-formatted feedback block, or empty string when there is no feedback. */
    readonly feedbackSection: string;
}

/** Variables for the plan-refinement system prompt (static, no placeholders). */
export type PlanningRefineSystemVars = Record<never, string>;

/** Variables for the plan-refinement user prompt. */
export interface PlanningRefineUserVars {
    readonly existingPlanForAi: string;
    readonly rejectionComment: string;
}

/** Variables for the implementation system prompt (static, no placeholders). */
export type ImplementationSystemVars = Record<never, string>;

/** Variables for the implementation user prompt. */
export interface ImplementationUserVars {
    readonly planForAi: string;
    readonly codebaseContext: string;
}

/** Variables for the implementation PR-feedback user prompt. */
export interface ImplementationPrFeedbackUserVars {
    readonly planForAi: string;
    readonly reviewComments: string;
    readonly codebaseContext: string;
}

/** Variables for the implementation clarification user prompt. */
export interface ImplementationClarificationUserVars {
    readonly planForAi: string;
    readonly clarification: string;
    readonly codebaseContext: string;
}

/**
 * Maps every PromptKey to the exact variables shape its template expects.
 * Callers must supply exactly these fields when calling `getPrompt`.
 */
export interface PromptVariables {
    'investigation.system': InvestigationSystemVars;
    'investigation.user': InvestigationUserVars;
    'planning.system': PlanningSystemVars;
    'planning.user': PlanningUserVars;
    'planning.refine.system': PlanningRefineSystemVars;
    'planning.refine.user': PlanningRefineUserVars;
    'implementation.system': ImplementationSystemVars;
    'implementation.user': ImplementationUserVars;
    'implementation.pr-feedback.user': ImplementationPrFeedbackUserVars;
    'implementation.clarification.user': ImplementationClarificationUserVars;
}

/**
 * Registry that stores and renders prompt templates.
 * Templates are plain strings containing `${variableName}` placeholders.
 * Call `getPrompt` with the key and the required variables to get the resolved string.
 */
export interface PromptRegistry {
    /**
     * Resolves a prompt template by key, substituting all `${placeholder}` tokens
     * with the provided variables.
     * @throws {ConfigError} if the key is unknown or a placeholder is unresolved.
     */
    getPrompt<K extends PromptKey>(key: K, variables: PromptVariables[K]): string;
}

