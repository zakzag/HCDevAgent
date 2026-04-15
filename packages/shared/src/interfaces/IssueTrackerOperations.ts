import type { Issue, Comment } from '../types/domain.types.js';

/**
 * High-level, workflow-aware interface consumed by the Conductor.
 * Each method internally composes one or more IssueReader/IssueWriter calls.
 * Matches 3-interfaces.md §3.
 */
export interface IssueTrackerOperations {
    /** Poll for the next issue in SELECTED FOR TRIAGE status. */
    fetchNextIssue(): Promise<Issue | null>;

    /** Transition issue to ISSUE INVESTIGATION. */
    startInvestigation(issueKey: string): Promise<void>;

    /** Transition to BLOCKED FOR PLAN CLARIFICATION + post comment with questions. */
    markBlockedForPlanClarification(issueKey: string, questions: string): Promise<void>;

    /** Write Description For AI field + transition to PLAN. */
    moveToPlan(issueKey: string, descriptionForAi: string): Promise<void>;

    /** Write Implementation Plan + Implementation Plan For AI fields + transition to PLAN REVIEW. */
    moveToPlanReview(issueKey: string, plan: string, planForAi: string): Promise<void>;

    /** Transition to IN PROGRESS + write Branch Name field. */
    startImplementation(issueKey: string, branchName: string): Promise<void>;

    /** Transition to BLOCKED FOR CODE CLARIFICATION + post comment with questions. */
    markBlockedForCodeClarification(issueKey: string, questions: string): Promise<void>;

    /** Transition to IN PROGRESS (after code clarification resolved). */
    resumeImplementation(issueKey: string): Promise<void>;

    /** Transition to CODE COMMITTED. */
    markCodeCommitted(issueKey: string): Promise<void>;

    /** Transition to PR IN REVIEW + write PR URL field + comment with PR URL. */
    markPrInReview(issueKey: string, prUrl: string): Promise<void>;

    /** Transition to PR APPROVED. */
    markPrApproved(issueKey: string): Promise<void>;

    /** Transition to DONE. */
    markDone(issueKey: string): Promise<void>;

    /** Transition to PR CHANGES REQUESTED + comment. */
    markPrChangesRequested(issueKey: string, reviewComment: string): Promise<void>;

    /** Transition to FAILURE + write Failure Reason field + comment. */
    markFailed(issueKey: string, reason: string): Promise<void>;

    /** Read Description For AI custom field. */
    getDescriptionForAi(issueKey: string): Promise<string | null>;

    /** Read Implementation Plan custom field. */
    getPlan(issueKey: string): Promise<string | null>;

    /** Read Implementation Plan For AI custom field. */
    getPlanForAi(issueKey: string): Promise<string | null>;

    /** Read Branch Name custom field. */
    getBranchName(issueKey: string): Promise<string | null>;

    /** Read PR URL custom field. */
    getPrUrl(issueKey: string): Promise<string | null>;

    /** Read the latest human comment (for clarification responses). */
    getLatestHumanReply(issueKey: string): Promise<Comment | null>;

    /** Read current status (for detecting cancellation / external changes). */
    getCurrentStatus(issueKey: string): Promise<string>;
}
