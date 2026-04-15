import { vi } from 'vitest';
import type { IssueWriter } from '../../interfaces/IssueWriter.js';

/**
 * Mock implementation of the IssueWriter interface for testing.
 */
export class MockIssueWriter implements IssueWriter {
    public transitionStatus = vi.fn<[string, string], Promise<void>>();
    public addComment = vi.fn<[string, string], Promise<void>>();
    public updateCustomField = vi.fn<[string, string, string], Promise<void>>();
}
