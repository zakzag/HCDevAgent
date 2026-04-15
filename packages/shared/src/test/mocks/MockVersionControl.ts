import { vi } from 'vitest';
import type { VersionControl } from '../../interfaces/VersionControl.js';
import type { CodeChanges, PrOptions, PrStatus, PullRequest } from '../../types/domain.types.js';

/**
 * Mock implementation of the VersionControl interface for testing.
 */
export class MockVersionControl implements VersionControl {
    public createBranch = vi.fn<[string, string?], Promise<void>>();
    public applyChanges = vi.fn<[CodeChanges], Promise<void>>();
    public commit = vi.fn<[string], Promise<string>>();
    public push = vi.fn<[string], Promise<void>>();
    public createPullRequest = vi.fn<[PrOptions], Promise<PullRequest>>();
    public getPullRequestStatus = vi.fn<[string], Promise<PrStatus>>();
    public deleteBranch = vi.fn<[string], Promise<void>>();
}
