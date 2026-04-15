import { vi } from 'vitest';
import type { IssueReader } from '../../interfaces/IssueReader.js';
import type { Issue, Comment } from '../../types/domain.types.js';

/**
 * Mock implementation of the IssueReader interface for testing.
 */
export class MockIssueReader implements IssueReader {
    public fetchIssuesByStatus = vi.fn<[string], Promise<ReadonlyArray<Issue>>>();
    public getIssue = vi.fn<[string], Promise<Issue>>();
    public getComments = vi.fn<[string], Promise<ReadonlyArray<Comment>>>();
    public getLatestComment = vi.fn<[string], Promise<Comment | null>>();
    public getCustomField = vi.fn<[string, string], Promise<string | null>>();
    public getStatus = vi.fn<[string], Promise<string>>();
}
