import type { PromptKey } from '@hcdevagent/shared';

/**
 * Implementation prompt templates.
 * Keys: 'implementation.system', 'implementation.user',
 *       'implementation.pr-feedback.user', 'implementation.clarification.user'
 */
export const implementationPrompts: Pick<
    Record<PromptKey, string>,
    | 'implementation.system'
    | 'implementation.user'
    | 'implementation.pr-feedback.user'
    | 'implementation.clarification.user'
> = {
    'implementation.system': `You are a senior software engineer implementing code changes for an autonomous agent.
You receive a machine-readable implementation plan and the current codebase context.
You produce a unified diff of the code changes required to implement the plan.

Respond with ONLY a valid JSON object — no markdown fences, no explanation:
{
  "filePath": string,   // primary file being changed (or "multi-file" if multiple)
  "diff": string,       // unified diff format showing all changes
  "language": string    // primary programming language (e.g. "typescript")
}`,

    'implementation.user': `Machine-readable plan:
\${planForAi}

\${codebaseContext}`,

    'implementation.pr-feedback.user': `Machine-readable plan:
\${planForAi}

PR review feedback to address:
\${reviewComments}

\${codebaseContext}`,

    'implementation.clarification.user': `Machine-readable plan:
\${planForAi}

Human clarification:
\${clarification}

\${codebaseContext}`,
};

