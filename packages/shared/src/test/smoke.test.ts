import { describe, it, expect } from 'vitest';
import {
  SYMBOLS,
  WORKFLOW_STATUSES,
  EVENT_NAMES,
  PHASE_NAMES,
  BaseError,
  ValidationError,
  IntegrationError,
  StorageError,
  ConfigError,
  ImplementationError,
} from '../index.js';

describe('shared package smoke test', () => {
  it('should export SYMBOLS with all injection tokens', () => {
    expect(SYMBOLS).toBeDefined();
    expect(SYMBOLS.Logger).toBeDefined();
    expect(SYMBOLS.ConfigProvider).toBeDefined();
    expect(SYMBOLS.IssueReader).toBeDefined();
    expect(SYMBOLS.IssueWriter).toBeDefined();
    expect(SYMBOLS.StorageAdapter).toBeDefined();
    expect(SYMBOLS.VersionControl).toBeDefined();
    expect(SYMBOLS.EventBus).toBeDefined();
    expect(SYMBOLS.Conductor).toBeDefined();
  });

  it('should export WORKFLOW_STATUSES', () => {
    expect(WORKFLOW_STATUSES).toBeDefined();
    expect(WORKFLOW_STATUSES.TODO).toBe('To Do');
    expect(WORKFLOW_STATUSES.DONE).toBe('Done');
  });

  it('should export EVENT_NAMES', () => {
    expect(EVENT_NAMES).toBeDefined();
    expect(EVENT_NAMES.ISSUE_PICKED).toBe('issue.picked');
  });

  it('should export PHASE_NAMES', () => {
    expect(PHASE_NAMES).toBeDefined();
    expect(PHASE_NAMES.INVESTIGATION).toBe('investigation');
  });

  it('should export all error classes', () => {
    expect(BaseError).toBeDefined();
    expect(ValidationError).toBeDefined();
    expect(IntegrationError).toBeDefined();
    expect(StorageError).toBeDefined();
    expect(ConfigError).toBeDefined();
    expect(ImplementationError).toBeDefined();
  });

  it('should create error instances with correct name and context', () => {
    const error = new ValidationError('test error', { field: 'name' });
    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('test error');
    expect(error.context).toEqual({ field: 'name' });
  });
});

