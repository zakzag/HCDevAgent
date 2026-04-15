import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
    IssueTrackerOperations,
    IssueInvestigator,
    StorageAdapter,
    EventBus,
    Logger,
    ConfigProvider,
    InvestigationResult,
} from '@hcdevagent/shared';
import { EVENT_NAMES, WORKFLOW_STATUSES } from '@hcdevagent/shared';
import { Conductor } from '../../conductor/Conductor.js';
import { testIssue } from '../fixtures/testIssue.fixture.js';

/** Creates a mock Logger. */
const createMockLogger = (): Logger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
});

/** Creates a mock ConfigProvider. */
const createMockConfigProvider = (): ConfigProvider => ({
    getRequired: vi.fn().mockReturnValue('test'),
    getOptional: vi.fn().mockReturnValue(undefined),
    getRequiredNumber: vi.fn().mockReturnValue(0),
    getOptionalNumber: vi.fn().mockReturnValue(undefined),
});

/** Creates a mock EventBus. */
const createMockEventBus = (): EventBus => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
});

/** Creates a mock StorageAdapter. */
const createMockStorage = (): StorageAdapter => ({
    getActiveIssue: vi.fn().mockResolvedValue(null),
    setActiveIssue: vi.fn().mockResolvedValue(undefined),
    clearActiveIssue: vi.fn().mockResolvedValue(undefined),
    addExecutionLog: vi.fn().mockResolvedValue(undefined),
    getExecutionHistory: vi.fn().mockResolvedValue([]),
    addMetric: vi.fn().mockResolvedValue(undefined),
    updateMetric: vi.fn().mockResolvedValue(undefined),
    getMetrics: vi.fn().mockResolvedValue([]),
    getConfigOverride: vi.fn().mockResolvedValue(null),
    setConfigOverride: vi.fn().mockResolvedValue(undefined),
});

/** Creates a mock IssueTrackerOperations. */
const createMockIssueOps = (): IssueTrackerOperations => ({
    fetchNextIssue: vi.fn().mockResolvedValue(null),
    startInvestigation: vi.fn().mockResolvedValue(undefined),
    markBlockedForPlanClarification: vi.fn().mockResolvedValue(undefined),
    moveToPlan: vi.fn().mockResolvedValue(undefined),
    moveToPlanReview: vi.fn().mockResolvedValue(undefined),
    startImplementation: vi.fn().mockResolvedValue(undefined),
    markBlockedForCodeClarification: vi.fn().mockResolvedValue(undefined),
    resumeImplementation: vi.fn().mockResolvedValue(undefined),
    markCodeCommitted: vi.fn().mockResolvedValue(undefined),
    markPrInReview: vi.fn().mockResolvedValue(undefined),
    markPrApproved: vi.fn().mockResolvedValue(undefined),
    markDone: vi.fn().mockResolvedValue(undefined),
    markPrChangesRequested: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    getDescriptionForAi: vi.fn().mockResolvedValue(null),
    getPlan: vi.fn().mockResolvedValue(null),
    getPlanForAi: vi.fn().mockResolvedValue(null),
    getBranchName: vi.fn().mockResolvedValue(null),
    getPrUrl: vi.fn().mockResolvedValue(null),
    getLatestHumanReply: vi.fn().mockResolvedValue(null),
    getCurrentStatus: vi.fn().mockResolvedValue(WORKFLOW_STATUSES.ISSUE_INVESTIGATION),
});

/** Creates a mock IssueInvestigator. */
const createMockInvestigator = (): IssueInvestigator => ({
    investigate: vi.fn().mockResolvedValue({
        ready: true,
        descriptionForAi: 'Test description for AI',
        clarificationQuestions: null,
        qualityReport: {
            clarity: { passed: true, summary: 'Clear' },
            completeness: { passed: true, summary: 'Complete' },
            ambiguity: { passed: true, summary: 'Unambiguous' },
            specificity: { passed: true, summary: 'Specific' },
            conflictDetection: { passed: true, summary: 'No conflicts' },
            scope: { passed: true, summary: 'Well-scoped' },
        },
    } satisfies InvestigationResult),
});

describe('Conductor', () => {
    let conductor: Conductor;
    let issueOps: IssueTrackerOperations;
    let investigator: IssueInvestigator;
    let storage: StorageAdapter;
    let eventBus: EventBus;
    let logger: Logger;
    let configProvider: ConfigProvider;

    beforeEach(() => {
        issueOps = createMockIssueOps();
        investigator = createMockInvestigator();
        storage = createMockStorage();
        eventBus = createMockEventBus();
        logger = createMockLogger();
        configProvider = createMockConfigProvider();

        conductor = new Conductor(
            issueOps,
            investigator,
            storage,
            eventBus,
            logger,
            configProvider,
        );
    });

    describe('start/stop lifecycle', () => {
        it('should start and set isRunning to true', async () => {
            expect(conductor.getIsRunning()).toBe(false);
            await conductor.start();
            expect(conductor.getIsRunning()).toBe(true);
            await conductor.stop();
        });

        it('should stop and set isRunning to false', async () => {
            await conductor.start();
            await conductor.stop();
            expect(conductor.getIsRunning()).toBe(false);
        });

        it('should emit CONDUCTOR_STARTED event on start', async () => {
            await conductor.start();
            expect(eventBus.emit).toHaveBeenCalledWith(EVENT_NAMES.CONDUCTOR_STARTED, expect.any(Object));
            await conductor.stop();
        });

        it('should emit CONDUCTOR_STOPPED event on stop', async () => {
            await conductor.start();
            await conductor.stop();
            expect(eventBus.emit).toHaveBeenCalledWith(EVENT_NAMES.CONDUCTOR_STOPPED, expect.any(Object));
        });

        it('should warn if started while already running', async () => {
            await conductor.start();
            await conductor.start();
            expect(logger.warn).toHaveBeenCalledWith('Conductor is already running');
            await conductor.stop();
        });
    });

    describe('tick — no issue found', () => {
        it('should emit CONDUCTOR_IDLE when no issues are in queue', async () => {
            (issueOps.fetchNextIssue as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            await conductor.tick();
            expect(eventBus.emit).toHaveBeenCalledWith(EVENT_NAMES.CONDUCTOR_IDLE, {});
        });

        it('should not call startInvestigation when no issues found', async () => {
            (issueOps.fetchNextIssue as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            await conductor.tick();
            expect(issueOps.startInvestigation).not.toHaveBeenCalled();
        });
    });

    describe('tick — issue found, investigation ready', () => {
        beforeEach(() => {
            (issueOps.fetchNextIssue as ReturnType<typeof vi.fn>).mockResolvedValue(testIssue);
        });

        it('should pick up the issue and emit ISSUE_PICKED', async () => {
            await conductor.tick();
            expect(eventBus.emit).toHaveBeenCalledWith(EVENT_NAMES.ISSUE_PICKED, { issueKey: testIssue.key });
        });

        it('should start investigation', async () => {
            await conductor.tick();
            expect(issueOps.startInvestigation).toHaveBeenCalledWith(testIssue.key);
        });

        it('should call investigator.investigate with the issue', async () => {
            await conductor.tick();
            expect(investigator.investigate).toHaveBeenCalledWith(testIssue);
        });

        it('should move to plan when investigation is ready', async () => {
            await conductor.tick();
            expect(issueOps.moveToPlan).toHaveBeenCalledWith(testIssue.key, 'Test description for AI');
        });

        it('should emit INVESTIGATION_READY event', async () => {
            await conductor.tick();
            expect(eventBus.emit).toHaveBeenCalledWith(EVENT_NAMES.INVESTIGATION_READY, { issueKey: testIssue.key });
        });
    });

    describe('tick — issue found, investigation blocked', () => {
        beforeEach(() => {
            (issueOps.fetchNextIssue as ReturnType<typeof vi.fn>).mockResolvedValue(testIssue);
            (investigator.investigate as ReturnType<typeof vi.fn>).mockResolvedValue({
                ready: false,
                descriptionForAi: null,
                clarificationQuestions: ['What is the expected output?', 'What error are you seeing?'],
                qualityReport: {
                    clarity: { passed: false, summary: 'Unclear' },
                    completeness: { passed: false, summary: 'Incomplete' },
                    ambiguity: { passed: true, summary: 'OK' },
                    specificity: { passed: true, summary: 'OK' },
                    conflictDetection: { passed: true, summary: 'OK' },
                    scope: { passed: true, summary: 'OK' },
                },
            } satisfies InvestigationResult);
        });

        it('should mark blocked for plan clarification with questions', async () => {
            await conductor.tick();
            expect(issueOps.markBlockedForPlanClarification).toHaveBeenCalledWith(
                testIssue.key,
                'What is the expected output?\n\nWhat error are you seeing?',
            );
        });

        it('should emit INVESTIGATION_BLOCKED event', async () => {
            await conductor.tick();
            expect(eventBus.emit).toHaveBeenCalledWith(EVENT_NAMES.INVESTIGATION_BLOCKED, { issueKey: testIssue.key });
        });

        it('should NOT move to plan', async () => {
            await conductor.tick();
            expect(issueOps.moveToPlan).not.toHaveBeenCalled();
        });
    });

    describe('tick — cancellation detection', () => {
        beforeEach(() => {
            (issueOps.fetchNextIssue as ReturnType<typeof vi.fn>).mockResolvedValue(testIssue);
        });

        it('should stop processing if issue is cancelled before investigation', async () => {
            (issueOps.getCurrentStatus as ReturnType<typeof vi.fn>).mockResolvedValue(WORKFLOW_STATUSES.CANCELLED);
            await conductor.tick();
            expect(investigator.investigate).not.toHaveBeenCalled();
            expect(eventBus.emit).toHaveBeenCalledWith(EVENT_NAMES.ISSUE_CANCELLED, { issueKey: testIssue.key });
        });

        it('should stop processing if issue is cancelled after investigation', async () => {
            // First call: not cancelled (during startInvestigation check)
            // Second call: cancelled (after investigate)
            (issueOps.getCurrentStatus as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce(WORKFLOW_STATUSES.ISSUE_INVESTIGATION)
                .mockResolvedValueOnce(WORKFLOW_STATUSES.CANCELLED);

            await conductor.tick();
            expect(investigator.investigate).toHaveBeenCalled();
            expect(issueOps.moveToPlan).not.toHaveBeenCalled();
        });
    });

    describe('tick — error handling', () => {
        it('should not throw when tick is called via start and an error occurs', async () => {
            (issueOps.fetchNextIssue as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
            // tick() itself would throw, but safeTick() should catch it
            await expect(conductor.start()).resolves.not.toThrow();
            expect(logger.error).toHaveBeenCalled();
            await conductor.stop();
        });
    });
});

