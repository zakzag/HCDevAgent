import { vi } from 'vitest';
import type { IssueWriter } from '../../interfaces/IssueWriter.js';

/**
 * Mock implementation of the IssueWriter interface for testing.
 */
export class MockIssueWriter implements IssueWriter {
  public transitionIssue = vi.fn<[string, string], Promise<void>>();
  public addComment = vi.fn<[string, string], Promise<void>>();
  public updateFields = vi.fn<[string, Record<string, unknown>], Promise<void>>();
}

