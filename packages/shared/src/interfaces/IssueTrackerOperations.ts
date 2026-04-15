import type { IssueReader } from './IssueReader.js';
import type { IssueWriter } from './IssueWriter.js';

/**
 * Combined issue tracker operations interface.
 * Extends both reader and writer capabilities.
 */
export interface IssueTrackerOperations extends IssueReader, IssueWriter {}

