import { injectable, inject } from 'inversify';
import type { IssueReader, IssueWriter, IssueTrackerOperations, Issue, Comment, Logger } from '@hcdevagent/shared';
import { SYMBOLS, WORKFLOW_STATUSES, JIRA_CUSTOM_FIELDS, NotImplementedError } from '@hcdevagent/shared';

/**
 * High-level, workflow-aware module that composes IssueReader/IssueWriter
 * calls into composite operations consumed by the Conductor.
 * Implements IssueTrackerOperations from 3-interfaces.md §3.
 */
@injectable()
export class IssueTrackerModule implements IssueTrackerOperations {
    constructor(
        @inject(SYMBOLS.IssueReader) private readonly reader: IssueReader,
        @inject(SYMBOLS.IssueWriter) private readonly writer: IssueWriter,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
    ) {}

    // ── Phase 1 methods (fully implemented) ──────────────────────────────

    /** Poll for the next issue in SELECTED FOR TRIAGE status. */
    public async fetchNextIssue(): Promise<Issue | null> {
        this.logger.debug('Polling for next issue in Selected for Triage');
        const issues = await this.reader.fetchIssuesByStatus(WORKFLOW_STATUSES.SELECTED_FOR_TRIAGE);
        if (issues.length === 0) {
            return null;
        }
        return issues[0];
    }

    /** Transition issue to ISSUE INVESTIGATION. */
    public async startInvestigation(issueKey: string): Promise<void> {
        this.logger.info('Starting investigation', { issueKey });
        await this.writer.transitionStatus(issueKey, WORKFLOW_STATUSES.ISSUE_INVESTIGATION);
    }

    /** Transition to BLOCKED FOR PLAN CLARIFICATION + post comment with questions. */
    public async markBlockedForPlanClarification(issueKey: string, questions: string): Promise<void> {
        this.logger.info('Marking blocked for plan clarification', { issueKey });
        await this.writer.transitionStatus(issueKey, WORKFLOW_STATUSES.BLOCKED_FOR_PLAN_CLARIFICATION);
        await this.writer.addComment(issueKey, questions);
    }

    /** Write Description For AI field + transition to PLAN. */
    public async moveToPlan(issueKey: string, descriptionForAi: string): Promise<void> {
        this.logger.info('Moving to Plan', { issueKey });
        await this.writer.updateCustomField(issueKey, JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI, descriptionForAi);
        await this.writer.transitionStatus(issueKey, WORKFLOW_STATUSES.PLAN);
    }

    /** Transition to FAILURE + write Failure Reason field + comment. */
    public async markFailed(issueKey: string, reason: string): Promise<void> {
        this.logger.info('Marking issue as failed', { issueKey, reason });
        await this.writer.updateCustomField(issueKey, JIRA_CUSTOM_FIELDS.FAILURE_REASON, reason);
        await this.writer.transitionStatus(issueKey, WORKFLOW_STATUSES.FAILURE);
        await this.writer.addComment(issueKey, `Agent failure: ${reason}`);
    }

    /** Read the latest human comment (for clarification responses). */
    public async getLatestHumanReply(issueKey: string): Promise<Comment | null> {
        return this.reader.getLatestComment(issueKey);
    }

    /** Read current status (for detecting cancellation / external changes). */
    public async getCurrentStatus(issueKey: string): Promise<string> {
        return this.reader.getStatus(issueKey);
    }

    // ── Read convenience methods (fully implemented) ─────────────────────

    /** Read Description For AI custom field. */
    public async getDescriptionForAi(issueKey: string): Promise<string | null> {
        return this.reader.getCustomField(issueKey, JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI);
    }

    /** Read Implementation Plan custom field. */
    public async getPlan(issueKey: string): Promise<string | null> {
        return this.reader.getCustomField(issueKey, JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN);
    }

    /** Read Implementation Plan For AI custom field. */
    public async getPlanForAi(issueKey: string): Promise<string | null> {
        return this.reader.getCustomField(issueKey, JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN_FOR_AI);
    }

    /** Read Branch Name custom field. */
    public async getBranchName(issueKey: string): Promise<string | null> {
        return this.reader.getCustomField(issueKey, JIRA_CUSTOM_FIELDS.BRANCH_NAME);
    }

    /** Read PR URL custom field. */
    public async getPrUrl(issueKey: string): Promise<string | null> {
        return this.reader.getCustomField(issueKey, JIRA_CUSTOM_FIELDS.PR_URL);
    }

    // ── Phase 2+ methods (not yet implemented) ───────────────────────────

    /** Write Implementation Plan + Implementation Plan For AI fields + transition to PLAN REVIEW. */
    public async moveToPlanReview(issueKey: string, plan: string, planForAi: string): Promise<void> {
        throw new NotImplementedError('moveToPlanReview', { issueKey });
    }

    /** Transition to IN PROGRESS + write Branch Name field. */
    public async startImplementation(issueKey: string, branchName: string): Promise<void> {
        throw new NotImplementedError('startImplementation', { issueKey });
    }

    /** Transition to BLOCKED FOR CODE CLARIFICATION + post comment. */
    public async markBlockedForCodeClarification(issueKey: string, questions: string): Promise<void> {
        throw new NotImplementedError('markBlockedForCodeClarification', { issueKey });
    }

    /** Transition to IN PROGRESS (after code clarification resolved). */
    public async resumeImplementation(issueKey: string): Promise<void> {
        throw new NotImplementedError('resumeImplementation', { issueKey });
    }

    /** Transition to CODE COMMITTED. */
    public async markCodeCommitted(issueKey: string): Promise<void> {
        throw new NotImplementedError('markCodeCommitted', { issueKey });
    }

    /** Transition to PR IN REVIEW + write PR URL field + comment. */
    public async markPrInReview(issueKey: string, prUrl: string): Promise<void> {
        throw new NotImplementedError('markPrInReview', { issueKey });
    }

    /** Transition to PR APPROVED. */
    public async markPrApproved(issueKey: string): Promise<void> {
        throw new NotImplementedError('markPrApproved', { issueKey });
    }

    /** Transition to DONE. */
    public async markDone(issueKey: string): Promise<void> {
        throw new NotImplementedError('markDone', { issueKey });
    }

    /** Transition to PR CHANGES REQUESTED + comment. */
    public async markPrChangesRequested(issueKey: string, reviewComment: string): Promise<void> {
        throw new NotImplementedError('markPrChangesRequested', { issueKey });
    }
}
