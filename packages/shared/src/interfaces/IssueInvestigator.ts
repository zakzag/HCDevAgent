import type { Issue } from '../types/domain.types.js';
import type { InvestigationResult } from '../types/phases.types.js';

/**
 * Analyses a raw issue to determine whether it is ready for planning.
 * Called by the Conductor during Phase 1 (Investigation).
 * Matches 3-interfaces.md §4.
 */
export interface IssueInvestigator {
    /** Run all quality checks on the issue and produce a verdict. */
    investigate(issue: Issue, relatedIssues?: ReadonlyArray<Issue>): Promise<InvestigationResult>;
}
