import { vi } from 'vitest';
import type { GitRepository } from '../../interfaces/GitRepository.js';
import type { CodeChanges } from '../../types/domain.types.js';

/**
 * Mock implementation of the GitRepository interface for testing.
 */
export class MockGitRepository implements GitRepository {
    public createBranch = vi.fn<[string, string?], Promise<void>>();
    public applyChanges = vi.fn<[CodeChanges], Promise<void>>();
    public commit = vi.fn<[string], Promise<string>>();
    public push = vi.fn<[string], Promise<void>>();
    public deleteLocalBranch = vi.fn<[string, string?], Promise<void>>();
}

