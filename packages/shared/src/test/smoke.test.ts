import { describe, it, expect } from 'vitest';
import {
    SYMBOLS,
    WORKFLOW_STATUSES,
    EVENT_NAMES,
    PHASE_NAMES,
    JIRA_CUSTOM_FIELDS,
    BaseError,
    ValidationError,
    IntegrationError,
    StorageError,
    ConfigError,
    ImplementationError,
    NotImplementedError,
} from '../index.js';

describe('shared package smoke test', () => {
    it('should export SYMBOLS with all injection tokens', () => {
        expect(SYMBOLS).toBeDefined();
        expect(SYMBOLS.Logger).toBeDefined();
        expect(SYMBOLS.ConfigProvider).toBeDefined();
        expect(SYMBOLS.IssueReader).toBeDefined();
        expect(SYMBOLS.IssueWriter).toBeDefined();
        expect(SYMBOLS.IssueTrackerOperations).toBeDefined();
        expect(SYMBOLS.StorageAdapter).toBeDefined();
        expect(SYMBOLS.VersionControl).toBeDefined();
        expect(SYMBOLS.EventBus).toBeDefined();
        expect(SYMBOLS.Conductor).toBeDefined();
    });

    it('should export WORKFLOW_STATUSES matching Jira status names', () => {
        expect(WORKFLOW_STATUSES).toBeDefined();
        expect(WORKFLOW_STATUSES.SELECTED_FOR_TRIAGE).toBe('Selected for Triage');
        expect(WORKFLOW_STATUSES.ISSUE_INVESTIGATION).toBe('Issue Investigation');
        expect(WORKFLOW_STATUSES.PLAN).toBe('Plan');
        expect(WORKFLOW_STATUSES.DONE).toBe('Done');
        expect(WORKFLOW_STATUSES.CANCELLED).toBe('Cancelled');
        expect(WORKFLOW_STATUSES.FAILURE).toBe('Failure');
    });

    it('should export EVENT_NAMES', () => {
        expect(EVENT_NAMES).toBeDefined();
        expect(EVENT_NAMES.ISSUE_PICKED).toBe('issue.picked');
        expect(EVENT_NAMES.CONDUCTOR_STARTED).toBe('conductor.started');
        expect(EVENT_NAMES.INVESTIGATION_READY).toBe('investigation.ready');
    });

    it('should export JIRA_CUSTOM_FIELDS', () => {
        expect(JIRA_CUSTOM_FIELDS).toBeDefined();
        expect(JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI).toBe('description_for_ai');
        expect(JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN).toBe('implementation_plan');
        expect(JIRA_CUSTOM_FIELDS.FAILURE_REASON).toBe('failure_reason');
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
        expect(NotImplementedError).toBeDefined();
    });

    it('should create error instances with correct name and context', () => {
        const error = new ValidationError('test error', { field: 'name' });
        expect(error).toBeInstanceOf(BaseError);
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.name).toBe('ValidationError');
        expect(error.message).toBe('test error');
        expect(error.context).toEqual({ field: 'name' });
    });

    it('should create NotImplementedError with method name', () => {
        const error = new NotImplementedError('someMethod');
        expect(error).toBeInstanceOf(BaseError);
        expect(error.message).toContain('someMethod');
        expect(error.context).toHaveProperty('methodName', 'someMethod');
    });
});
