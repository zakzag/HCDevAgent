import { injectable, inject } from 'inversify';
import type {
    IssueTrackerOperations,
    IssueInvestigator,
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

        // 1. Poll for next issue
        const issue = await this.issueOps.fetchNextIssue();
        if (!issue) {
            this.logger.debug('No issues in queue, idle');
            this.eventBus.emit(EVENT_NAMES.CONDUCTOR_IDLE, {});
            return;
        }

        this.logger.info('Issue picked up', { issueKey: issue.key, summary: issue.summary });
        this.eventBus.emit(EVENT_NAMES.ISSUE_PICKED, { issueKey: issue.key });

        await this.processInvestigation(issue);
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
            this.logger.info('Investigation complete — issue is ready for planning', { issueKey });
            await this.issueOps.moveToPlan(issueKey, result.descriptionForAi);
            this.eventBus.emit(EVENT_NAMES.INVESTIGATION_READY, { issueKey });
        } else if (!result.ready && result.clarificationQuestions) {
            const questions = result.clarificationQuestions.join('\n\n');
            this.logger.info('Investigation needs clarification', { issueKey, questionCount: result.clarificationQuestions.length });
            await this.issueOps.markBlockedForPlanClarification(issueKey, questions);
            this.eventBus.emit(EVENT_NAMES.INVESTIGATION_BLOCKED, { issueKey });
        } else {
            this.logger.warn('Investigation returned unexpected result', { issueKey, result });
            await this.issueOps.markFailed(issueKey, 'Investigation returned an ambiguous result');
            this.eventBus.emit(EVENT_NAMES.ISSUE_FAILED, { issueKey });
        }
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
