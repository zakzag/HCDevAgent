import { vi } from 'vitest';
import type { VersionControl } from '../../interfaces/VersionControl.js';
import type { PullRequest } from '../../types/domain.types.js';

/**
 * Mock implementation of the VersionControl interface for testing.
 */
export class MockVersionControl implements VersionControl {
  public createBranch = vi.fn<[string], Promise<void>>();
  public commitChanges = vi.fn<[string, ReadonlyArray<string>], Promise<string>>();
  public createPullRequest = vi.fn<[string, string, string], Promise<PullRequest>>();
  public getPullRequestStatus = vi.fn<[string], Promise<string>>();
}

