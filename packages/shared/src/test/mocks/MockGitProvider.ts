import { vi } from 'vitest';
import type { GitProvider } from '../../interfaces/GitProvider.js';
import type { PrOptions, PrStatus, PullRequest } from '../../types/domain.types.js';

/**
 * Mock implementation of the GitProvider interface for testing.
 */
export class MockGitProvider implements GitProvider {
    public createPullRequest = vi.fn<[PrOptions], Promise<PullRequest>>();
    public getPullRequestStatus = vi.fn<[string], Promise<PrStatus>>();
    public deleteRemoteBranch = vi.fn<[string], Promise<void>>();
}

