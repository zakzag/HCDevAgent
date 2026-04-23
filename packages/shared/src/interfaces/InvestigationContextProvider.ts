import type { Issue } from '../types/domain.types.js';
import type { PreparedInvestigationContext } from '../types/phases.types.js';

/**
 * Builds repository-aware investigation input for a Jira issue.
 * Implementations can read project metadata, source files, and repo-specific settings.
 */
export interface InvestigationContextProvider {
    /** Returns the prompt context and automation settings to use for a specific issue. */
    loadContext(issue: Issue): Promise<PreparedInvestigationContext>;
}

