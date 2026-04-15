import { vi } from 'vitest';
import type { IssueTrackerOperations } from '../../interfaces/IssueTrackerOperations.js';
import type { Issue, Comment } from '../../types/domain.types.js';

/**
 * Mock implementation of the IssueTrackerOperations interface for testing.
 */
export class MockIssueTrackerOperations implements IssueTrackerOperations {
    public fetchNextIssue = vi.fn<[], Promise<Issue | null>>();
    public startInvestigation = vi.fn<[string], Promise<void>>();
    public markBlockedForPlanClarification = vi.fn<[string, string], Promise<void>>();
    public moveToPlan = vi.fn<[string, string], Promise<void>>();
    public moveToPlanReview = vi.fn<[string, string, string], Promise<void>>();
    public startImplementation = vi.fn<[string, string], Promise<void>>();
    public markBlockedForCodeClarification = vi.fn<[string, string], Promise<void>>();
    public resumeImplementation = vi.fn<[string], Promise<void>>();
    public markCodeCommitted = vi.fn<[string], Promise<void>>();
    public markPrInReview = vi.fn<[string, string], Promise<void>>();
    public markPrApproved = vi.fn<[string], Promise<void>>();
    public markDone = vi.fn<[string], Promise<void>>();
    public markPrChangesRequested = vi.fn<[string, string], Promise<void>>();
    public markFailed = vi.fn<[string, string], Promise<void>>();
    public getDescriptionForAi = vi.fn<[string], Promise<string | null>>();
    public getPlan = vi.fn<[string], Promise<string | null>>();
    public getPlanForAi = vi.fn<[string], Promise<string | null>>();
    public getBranchName = vi.fn<[string], Promise<string | null>>();
    public getPrUrl = vi.fn<[string], Promise<string | null>>();
    public getLatestHumanReply = vi.fn<[string], Promise<Comment | null>>();
    public getCurrentStatus = vi.fn<[string], Promise<string>>();
}

