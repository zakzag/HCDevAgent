import { describe, it, expect } from 'vitest';
import { SYMBOLS } from '@hcdevagent/shared';
import { container } from '../container.js';
import { createTestContainer } from './helpers/createTestContainer.js';

describe('agent package smoke test', () => {
    it('should export container', () => {
        expect(container).toBeDefined();
    });

    it('should resolve Logger from the production container', () => {
        const logger = container.get(SYMBOLS.Logger);
        expect(logger).toBeDefined();
    });

    it('should resolve ConfigProvider from the production container', () => {
        const configProvider = container.get(SYMBOLS.ConfigProvider);
        expect(configProvider).toBeDefined();
    });

    it('should resolve EventBus from the production container', () => {
        const eventBus = container.get(SYMBOLS.EventBus);
        expect(eventBus).toBeDefined();
    });

    it('should resolve Conductor from the production container', () => {
        const conductor = container.get(SYMBOLS.Conductor);
        expect(conductor).toBeDefined();
    });

    it('should resolve IssueTrackerOperations from the production container', () => {
        const issueOps = container.get(SYMBOLS.IssueTrackerOperations);
        expect(issueOps).toBeDefined();
    });

    it('should resolve IssueInvestigator from the production container', () => {
        const investigator = container.get(SYMBOLS.IssueInvestigator);
        expect(investigator).toBeDefined();
    });

    it('should create a test container with mock implementations', () => {
        const testContainer = createTestContainer();
        expect(testContainer).toBeDefined();

        const logger = testContainer.get(SYMBOLS.Logger);
        expect(logger).toBeDefined();

        const configProvider = testContainer.get(SYMBOLS.ConfigProvider);
        expect(configProvider).toBeDefined();

        const issueOps = testContainer.get(SYMBOLS.IssueTrackerOperations);
        expect(issueOps).toBeDefined();
    });

    it('should allow rebinding in test container', () => {
        const customLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, child: () => customLogger };
        const testContainer = createTestContainer((c) => {
            c.rebind(SYMBOLS.Logger).toConstantValue(customLogger);
        });

        const logger = testContainer.get(SYMBOLS.Logger);
        expect(logger).toBe(customLogger);
    });
});
