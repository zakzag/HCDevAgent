import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IssueReader, IssueWriter, Logger } from '@hcdevagent/shared';
import { WORKFLOW_STATUSES, JIRA_CUSTOM_FIELDS } from '@hcdevagent/shared';
import { IssueTrackerModule } from '../../modules/issueTracker/IssueTrackerModule.js';
import { testIssue } from '../fixtures/testIssue.fixture.js';

/** Creates a mock Logger. */
const createMockLogger = (): Logger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
});

describe('IssueTrackerModule', () => {
    let module: IssueTrackerModule;
    let reader: IssueReader;
    let writer: IssueWriter;

    beforeEach(() => {
        reader = {
            fetchIssuesByStatus: vi.fn().mockResolvedValue([]),
            getIssue: vi.fn().mockResolvedValue(testIssue),
            getComments: vi.fn().mockResolvedValue([]),
            getLatestComment: vi.fn().mockResolvedValue(null),
            getCustomField: vi.fn().mockResolvedValue(null),
            getStatus: vi.fn().mockResolvedValue(WORKFLOW_STATUSES.SELECTED_FOR_TRIAGE),
        };

        writer = {
            transitionStatus: vi.fn().mockResolvedValue(undefined),
            addComment: vi.fn().mockResolvedValue(undefined),
            updateCustomField: vi.fn().mockResolvedValue(undefined),
        };

        module = new IssueTrackerModule(reader, writer, createMockLogger());
    });

    describe('fetchNextIssue', () => {
        it('should return null when no issues found', async () => {
            const result = await module.fetchNextIssue();
            expect(result).toBeNull();
            expect(reader.fetchIssuesByStatus).toHaveBeenCalledWith(WORKFLOW_STATUSES.SELECTED_FOR_TRIAGE);
        });

        it('should return the first issue when issues are found', async () => {
            (reader.fetchIssuesByStatus as ReturnType<typeof vi.fn>).mockResolvedValue([testIssue]);
            const result = await module.fetchNextIssue();
            expect(result).toEqual(testIssue);
        });
    });

    describe('fetchNextPlanIssue', () => {
        it('should return null when no plan issues are found', async () => {
            const result = await module.fetchNextPlanIssue();
            expect(result).toBeNull();
            expect(reader.fetchIssuesByStatus).toHaveBeenCalledWith(WORKFLOW_STATUSES.PLAN);
        });

        it('should return the first plan issue when issues are found', async () => {
            (reader.fetchIssuesByStatus as ReturnType<typeof vi.fn>).mockResolvedValue([testIssue]);
            const result = await module.fetchNextPlanIssue();
            expect(result).toEqual(testIssue);
        });
    });

    describe('fetchNextReadyForImplementationIssue', () => {
        it('should return null when all approved issues already have planForAi', async () => {
            (reader.fetchIssuesByStatus as ReturnType<typeof vi.fn>).mockResolvedValue([{
                ...testIssue,
                customFields: {
                    ...testIssue.customFields,
                    [JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN_FOR_AI]: '## META\n- issueKey: TEST-1',
                },
            }]);

            const result = await module.fetchNextReadyForImplementationIssue();

            expect(result).toBeNull();
            expect(reader.fetchIssuesByStatus).toHaveBeenCalledWith(WORKFLOW_STATUSES.READY_FOR_IMPLEMENTATION);
        });

        it('should return the first approved issue missing planForAi', async () => {
            (reader.fetchIssuesByStatus as ReturnType<typeof vi.fn>).mockResolvedValue([testIssue]);

            const result = await module.fetchNextReadyForImplementationIssue();

            expect(result).toEqual(testIssue);
        });
    });

    describe('startInvestigation', () => {
        it('should transition to ISSUE INVESTIGATION', async () => {
            await module.startInvestigation('TEST-1');
            expect(writer.transitionStatus).toHaveBeenCalledWith('TEST-1', WORKFLOW_STATUSES.ISSUE_INVESTIGATION);
        });

        it('should skip the transition when the issue is already in ISSUE INVESTIGATION', async () => {
            (reader.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue(WORKFLOW_STATUSES.ISSUE_INVESTIGATION);

            await module.startInvestigation('TEST-1');

            expect(writer.transitionStatus).not.toHaveBeenCalled();
        });
    });

    describe('markBlockedForPlanClarification', () => {
        it('should transition and add comment', async () => {
            await module.markBlockedForPlanClarification('TEST-1', 'What is the scope?');
            expect(writer.transitionStatus).toHaveBeenCalledWith('TEST-1', WORKFLOW_STATUSES.BLOCKED_FOR_PLAN_CLARIFICATION);
            expect(writer.addComment).toHaveBeenCalledWith('TEST-1', 'What is the scope?');
        });
    });

    describe('moveToPlan', () => {
        it('should write description for AI and transition to PLAN', async () => {
            await module.moveToPlan('TEST-1', 'AI description');
            expect(writer.updateCustomField).toHaveBeenCalledWith(
                'TEST-1',
                JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI,
                'AI description',
            );
            expect(writer.transitionStatus).toHaveBeenCalledWith('TEST-1', WORKFLOW_STATUSES.PLAN);
        });

        it('should still update the custom field when the issue is already in PLAN', async () => {
            (reader.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue(WORKFLOW_STATUSES.PLAN);

            await module.moveToPlan('TEST-1', 'AI description');

            expect(writer.updateCustomField).toHaveBeenCalledWith(
                'TEST-1',
                JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI,
                'AI description',
            );
            expect(writer.transitionStatus).not.toHaveBeenCalled();
        });
    });

    describe('markFailed', () => {
        it('should write failure reason, transition to FAILURE, and add comment', async () => {
            await module.markFailed('TEST-1', 'Unrecoverable error');
            expect(writer.updateCustomField).toHaveBeenCalledWith(
                'TEST-1',
                JIRA_CUSTOM_FIELDS.FAILURE_REASON,
                'Unrecoverable error',
            );
            expect(writer.transitionStatus).toHaveBeenCalledWith('TEST-1', WORKFLOW_STATUSES.FAILURE);
            expect(writer.addComment).toHaveBeenCalledWith('TEST-1', 'Agent failure: Unrecoverable error');
        });

        it('should still write the failure reason and comment when already in FAILURE', async () => {
            (reader.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue(WORKFLOW_STATUSES.FAILURE);

            await module.markFailed('TEST-1', 'Unrecoverable error');

            expect(writer.updateCustomField).toHaveBeenCalledWith(
                'TEST-1',
                JIRA_CUSTOM_FIELDS.FAILURE_REASON,
                'Unrecoverable error',
            );
            expect(writer.transitionStatus).not.toHaveBeenCalled();
            expect(writer.addComment).toHaveBeenCalledWith('TEST-1', 'Agent failure: Unrecoverable error');
        });
    });

    describe('getCurrentStatus', () => {
        it('should delegate to reader.getStatus', async () => {
            (reader.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue(WORKFLOW_STATUSES.PLAN);
            const status = await module.getCurrentStatus('TEST-1');
            expect(status).toBe(WORKFLOW_STATUSES.PLAN);
        });
    });

    describe('getLatestHumanReply', () => {
        it('should delegate to reader.getLatestComment', async () => {
            const comment = { id: '1', author: 'Human', body: 'Reply', createdAt: '2026-01-01' };
            (reader.getLatestComment as ReturnType<typeof vi.fn>).mockResolvedValue(comment);
            const result = await module.getLatestHumanReply('TEST-1');
            expect(result).toEqual(comment);
        });
    });

    describe('read convenience methods', () => {
        it('getDescriptionForAi should read the correct custom field', async () => {
            await module.getDescriptionForAi('TEST-1');
            expect(reader.getCustomField).toHaveBeenCalledWith('TEST-1', JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI);
        });

        it('getPlan should read the correct custom field', async () => {
            await module.getPlan('TEST-1');
            expect(reader.getCustomField).toHaveBeenCalledWith('TEST-1', JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN);
        });

        it('getPlanForAi should read the correct custom field', async () => {
            await module.getPlanForAi('TEST-1');
            expect(reader.getCustomField).toHaveBeenCalledWith('TEST-1', JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN_FOR_AI);
        });

        it('getBranchName should read the correct custom field', async () => {
            await module.getBranchName('TEST-1');
            expect(reader.getCustomField).toHaveBeenCalledWith('TEST-1', JIRA_CUSTOM_FIELDS.BRANCH_NAME);
        });

        it('getPrUrl should read the correct custom field', async () => {
            await module.getPrUrl('TEST-1');
            expect(reader.getCustomField).toHaveBeenCalledWith('TEST-1', JIRA_CUSTOM_FIELDS.PR_URL);
        });
    });

    describe('moveToPlanReview', () => {
        it('should write only the reviewer-facing plan and transition to PLAN REVIEW', async () => {
            await module.moveToPlanReview('TEST-1', 'reviewer plan');

            expect(writer.updateCustomField).toHaveBeenCalledWith(
                'TEST-1',
                JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN,
                'reviewer plan',
            );
            expect(writer.transitionStatus).toHaveBeenCalledWith('TEST-1', WORKFLOW_STATUSES.PLAN_REVIEW);
        });

        it('should still write the reviewer-facing plan when the issue is already in PLAN REVIEW', async () => {
            (reader.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue(WORKFLOW_STATUSES.PLAN_REVIEW);

            await module.moveToPlanReview('TEST-1', 'reviewer plan');

            expect(writer.updateCustomField).toHaveBeenCalledWith(
                'TEST-1',
                JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN,
                'reviewer plan',
            );
            expect(writer.transitionStatus).not.toHaveBeenCalled();
        });
    });

    describe('storePlanForAi', () => {
        it('should write the machine-readable plan without changing status', async () => {
            await module.storePlanForAi('TEST-1', '## META\n- issueKey: TEST-1');

            expect(writer.updateCustomField).toHaveBeenCalledWith(
                'TEST-1',
                JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN_FOR_AI,
                '## META\n- issueKey: TEST-1',
            );
            expect(writer.transitionStatus).not.toHaveBeenCalled();
        });
    });

    describe('not-yet-implemented methods', () => {

        it('startImplementation should throw NotImplementedError', async () => {
            await expect(module.startImplementation('TEST-1', 'branch')).rejects.toThrow('not yet implemented');
        });

        it('markDone should throw NotImplementedError', async () => {
            await expect(module.markDone('TEST-1')).rejects.toThrow('not yet implemented');
        });
    });
});

