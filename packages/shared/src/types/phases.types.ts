/**
 * Phase result types for each agent workflow phase.
 */

import type { CodeChanges } from './domain.types.js';

/** Result of the investigation phase. */
export interface InvestigationResult {
  readonly issueKey: string;
  readonly summary: string;
  readonly analysis: string;
  readonly acceptanceCriteria: ReadonlyArray<string>;
  readonly suggestedApproach: string;
}

/** A single step in a generated plan. */
export interface PlanStep {
  readonly order: number;
  readonly description: string;
  readonly filePath: string | null;
  readonly estimatedComplexity: 'low' | 'medium' | 'high';
}

/** Result of the planning phase. */
export interface PlanResult {
  readonly issueKey: string;
  readonly steps: ReadonlyArray<PlanStep>;
  readonly estimatedFiles: ReadonlyArray<string>;
  readonly testStrategy: string;
}

/** Quality report produced after implementation. */
export interface QualityReport {
  readonly issueKey: string;
  readonly passedTests: number;
  readonly failedTests: number;
  readonly coveragePercentage: number;
  readonly lintErrors: number;
  readonly codeChanges: ReadonlyArray<CodeChanges>;
  readonly overallStatus: 'pass' | 'fail';
}

