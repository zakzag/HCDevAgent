import { vi } from 'vitest';
import type { PrOptions, PrStatus, PullRequest } from '@hcdevagent/shared';
import type { GitProvider } from '../../services/versionControl/GitProvider.js';

/**
 * Mock implementation of the remote GitProvider contract for agent tests.
 */
export class MockGitProvider implements GitProvider {
    public createPullRequest = vi.fn<[PrOptions], Promise<PullRequest>>();
    public getPullRequestStatus = vi.fn<[string], Promise<PrStatus>>();
    public deleteRemoteBranch = vi.fn<[string], Promise<void>>();
}

