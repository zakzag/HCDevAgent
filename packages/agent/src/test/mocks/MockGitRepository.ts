import { vi } from 'vitest';
import type { CodeChanges } from '@hcdevagent/shared';
import type { GitRepository } from '../../services/versionControl/GitRepository.js';

/**
 * Mock implementation of the local GitRepository contract for agent tests.
 */
export class MockGitRepository implements GitRepository {
    public createBranch = vi.fn<[string, string?], Promise<void>>();
    public applyChanges = vi.fn<[CodeChanges], Promise<void>>();
    public commit = vi.fn<[string], Promise<string>>();
    public push = vi.fn<[string], Promise<void>>();
    public deleteLocalBranch = vi.fn<[string, string?], Promise<void>>();
}

