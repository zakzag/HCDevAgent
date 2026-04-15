import type { Issue } from '../types/domain.types.js';
import type { InvestigationResult } from '../types/phases.types.js';

/**
 * Investigates an issue to extract acceptance criteria and approach.
 */
export interface IssueInvestigator {
  /** Analyzes an issue and produces an investigation result. */
  investigate(issue: Issue): Promise<InvestigationResult>;
}

