import { injectable, inject } from 'inversify';
import type {
    IssueTrackerOperations,
    IssueInvestigator,
    PlanGenerator,
    StorageAdapter,
    EventBus,
    Logger,
    ConfigProvider,
    Issue,
} from '@hcdevagent/shared';
import { SYMBOLS, EVENT_NAMES, WORKFLOW_STATUSES } from '@hcdevagent/shared';

/** Default polling interval in milliseconds. */
const DEFAULT_POLL_INTERVAL_MS = 30_000;

/**
 * The main orchestrator that drives the agent workflow.
 * Polls for issues, runs investigation, and transitions through the workflow.
 */
@injectable()
export class Conductor {
    private isRunning = false;
    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private tickInProgress = false;
    private readonly pollIntervalMs: number;

    constructor(
        @inject(SYMBOLS.IssueTrackerOperations) private readonly issueOps: IssueTrackerOperations,
        @inject(SYMBOLS.IssueInvestigator) private readonly investigator: IssueInvestigator,
        @inject(SYMBOLS.PlanGenerator) private readonly planGenerator: PlanGenerator,
        @inject(SYMBOLS.StorageAdapter) private readonly storage: StorageAdapter,
        @inject(SYMBOLS.EventBus) private readonly eventBus: EventBus,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
        @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
    ) {
        this.pollIntervalMs = configProvider.getOptionalNumber('AGENT_POLL_INTERVAL_MS') ?? DEFAULT_POLL_INTERVAL_MS;
    }

    /** Starts the conductor polling loop. */
    public async start(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('Conductor is already running');
            return;
        }
        this.isRunning = true;
        this.logger.info('Conductor starting', { pollIntervalMs: this.pollIntervalMs });
        this.eventBus.emit(EVENT_NAMES.CONDUCTOR_STARTED, { pollIntervalMs: this.pollIntervalMs });

        // Run first tick immediately, then schedule subsequent ticks
        await this.safeTick();
        this.pollTimer = setInterval(() => void this.safeTick(), this.pollIntervalMs);
    }

    /** Stops the conductor. Waits for in-flight work to complete. */
    public async stop(): Promise<void> {
        this.logger.info('Conductor stopping');
        this.isRunning = false;

        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }

        // Wait for in-flight tick to finish
        while (this.tickInProgress) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        this.eventBus.emit(EVENT_NAMES.CONDUCTOR_STOPPED, {});
        this.logger.info('Conductor stopped');
    }

    /** Returns whether the conductor is currently running. */
    public getIsRunning(): boolean {
        return this.isRunning;
    }

    /**
     * A single poll iteration. Fetches the next issue and processes it
     * through the investigation phase.
     */
    public async tick(): Promise<void> {
        this.logger.debug('Conductor tick starting');
        this.eventBus.emit(EVENT_NAMES.CONDUCTOR_POLL, {});

        // 1. Poll for next issue across active workflow entry points.
        const triageIssue = await this.issueOps.fetchNextIssue();
        if (triageIssue) {
            this.logger.info('Issue picked up for investigation', { issueKey: triageIssue.key, summary: triageIssue.summary });
            this.eventBus.emit(EVENT_NAMES.ISSUE_PICKED, { issueKey: triageIssue.key });
            await this.processInvestigation(triageIssue);
            return;
        }

        const planIssue = await this.issueOps.fetchNextPlanIssue();
        if (planIssue) {
            this.logger.info('Issue picked up for planning', { issueKey: planIssue.key, summary: planIssue.summary });
            this.eventBus.emit(EVENT_NAMES.ISSUE_PICKED, { issueKey: planIssue.key });
            await this.processPlanning(planIssue);
            return;
        }

        const approvedIssue = await this.issueOps.fetchNextReadyForImplementationIssue();
        if (approvedIssue) {
            this.logger.info('Issue picked up for post-approval plan-for-AI generation', {
                issueKey: approvedIssue.key,
                summary: approvedIssue.summary,
            });
            this.eventBus.emit(EVENT_NAMES.ISSUE_PICKED, { issueKey: approvedIssue.key });
            await this.processApprovedPlan(approvedIssue);
            return;
        }

        this.logger.debug('No issues in queue, idle');
        this.eventBus.emit(EVENT_NAMES.CONDUCTOR_IDLE, {});
    }

    /** Processes the investigation phase for a single issue. */
    private async processInvestigation(issue: Issue): Promise<void> {
        const { key: issueKey } = issue;

        // 2. Transition to ISSUE INVESTIGATION
        await this.issueOps.startInvestigation(issueKey);
        this.eventBus.emit(EVENT_NAMES.INVESTIGATION_STARTED, { issueKey });
        this.logger.info('Investigation started', { issueKey });

        // 3. Check for cancellation before investigation
        if (await this.isCancelled(issueKey)) return;

        // 4. Run investigation
        const result = await this.investigator.investigate(issue);

        // 5. Check for cancellation after investigation
        if (await this.isCancelled(issueKey)) return;

        // 6. Handle investigation result
        if (result.ready && result.descriptionForAi) {
            this.logger.info('Investigation complete - issue is ready for planning', {
                issueKey,
                autoFixabilityDecision: result.autoFixabilityReport.decision,
                autoFixabilityScore: result.autoFixabilityReport.score,
            });
            await this.issueOps.moveToPlan(issueKey, result.descriptionForAi);
            this.eventBus.emit(EVENT_NAMES.INVESTIGATION_READY, { issueKey });
        } else if (!result.ready && result.clarificationQuestions) {
            const questions = result.clarificationQuestions.join('\n\n');
            this.logger.info('Investigation needs clarification', {
                issueKey,
                questionCount: result.clarificationQuestions.length,
                autoFixabilityDecision: result.autoFixabilityReport.decision,
                blockingReasons: result.autoFixabilityReport.blockingReasons,
            });
            await this.issueOps.markBlockedForPlanClarification(issueKey, questions);
            this.eventBus.emit(EVENT_NAMES.INVESTIGATION_BLOCKED, { issueKey });
        } else {
            this.logger.warn('Investigation returned unexpected result', { issueKey, result });
            await this.issueOps.markFailed(issueKey, 'Investigation returned an ambiguous result');
            this.eventBus.emit(EVENT_NAMES.ISSUE_FAILED, { issueKey });
        }
    }

    /** Processes the planning phase for a single issue in PLAN status. */
    private async processPlanning(issue: Issue): Promise<void> {
        const { key: issueKey } = issue;

        if (await this.isCancelled(issueKey)) return;

        const descriptionForAi = await this.issueOps.getDescriptionForAi(issueKey);
        if (!descriptionForAi) {
            await this.issueOps.markFailed(issueKey, 'Description For AI is missing for planning');
            this.eventBus.emit(EVENT_NAMES.ISSUE_FAILED, { issueKey });
            return;
        }

        const existingPlan = await this.issueOps.getPlan(issueKey);
        const latestHumanReply = await this.issueOps.getLatestHumanReply(issueKey);
        const rejectionComment = latestHumanReply?.body.trim() ?? '';
        const isRefinement = existingPlan !== null && existingPlan.trim().length > 0 && rejectionComment.length > 0;

        if (isRefinement) {
            this.logger.info('Plan rejected by human reviewer, refining plan', { issueKey });
            this.eventBus.emit(EVENT_NAMES.PLAN_REJECTED, { issueKey });
        }

        this.eventBus.emit(EVENT_NAMES.PLAN_STARTED, {
            issueKey,
            mode: isRefinement ? 'refine' : 'generate',
        });

        const plan = isRefinement
            ? await this.planGenerator.refinePlan(existingPlan, rejectionComment, descriptionForAi)
            : await this.planGenerator.generatePlan(descriptionForAi);

        if (await this.isCancelled(issueKey)) return;

        await this.issueOps.moveToPlanReview(issueKey, plan);
        this.logger.info('Reviewer-facing plan generated and moved to Plan Review', { issueKey });
    }

    /** Generates `Implementation Plan For AI` after the reviewer plan has been approved. */
    private async processApprovedPlan(issue: Issue): Promise<void> {
        const { key: issueKey } = issue;

        if (await this.isCancelled(issueKey)) return;

        const descriptionForAi = await this.issueOps.getDescriptionForAi(issueKey);
        if (!descriptionForAi) {
            await this.issueOps.markFailed(issueKey, 'Description For AI is missing for post-approval plan generation');
            this.eventBus.emit(EVENT_NAMES.ISSUE_FAILED, { issueKey });
            return;
        }

        const approvedPlan = await this.issueOps.getPlan(issueKey);
        if (!approvedPlan) {
            await this.issueOps.markFailed(issueKey, 'Implementation Plan is missing for post-approval plan generation');
            this.eventBus.emit(EVENT_NAMES.ISSUE_FAILED, { issueKey });
            return;
        }

        this.eventBus.emit(EVENT_NAMES.PLAN_STARTED, { issueKey, mode: 'generatePlanForAi' });
        const planForAi = await this.planGenerator.generatePlanForAi(descriptionForAi, approvedPlan);

        if (await this.isCancelled(issueKey)) return;

        await this.issueOps.storePlanForAi(issueKey, planForAi);
        this.eventBus.emit(EVENT_NAMES.PLAN_COMPLETED, { issueKey });
        this.logger.info('Implementation Plan For AI generated after plan approval', { issueKey });
    }

    /** Wraps tick() in error handling and concurrency guard. */
    private async safeTick(): Promise<void> {
        if (!this.isRunning) return;
        if (this.tickInProgress) {
            this.logger.debug('Previous tick still in progress, skipping');
            return;
        }

        this.tickInProgress = true;
        try {
            await this.tick();
        } catch (error) {
            this.logger.error('Conductor tick failed', error instanceof Error ? error : new Error(String(error)));
            this.eventBus.emit(EVENT_NAMES.CONDUCTOR_ERROR, { error: String(error) });
        } finally {
            this.tickInProgress = false;
        }
    }

    /** Checks whether the issue has been cancelled externally. */
    private async isCancelled(issueKey: string): Promise<boolean> {
        try {
            const currentStatus = await this.issueOps.getCurrentStatus(issueKey);
            if (currentStatus === WORKFLOW_STATUSES.CANCELLED) {
                this.logger.info('Issue was cancelled externally', { issueKey });
                this.eventBus.emit(EVENT_NAMES.ISSUE_CANCELLED, { issueKey });
                return true;
            }
            return false;
        } catch {
            // If we can't check status, assume not cancelled and continue
            return false;
        }
    }
}
