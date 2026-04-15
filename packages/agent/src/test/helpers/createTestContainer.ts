import 'reflect-metadata';
import { Container } from 'inversify';
import {
    SYMBOLS,
    MockLogger,
    MockConfigProvider,
    MockIssueReader,
    MockIssueWriter,
    MockStorageAdapter,
    MockVersionControl,
    MockEventBus,
    MockIssueTrackerOperations,
} from '@hcdevagent/shared';

/**
 * Callback type for rebinding specific tokens in the test container.
 */
type RebindCallback = (container: Container) => void;

/**
 * Creates a fresh DI container wired with all mock implementations.
 * Optionally accepts a callback to rebind specific tokens per test.
 */
export const createTestContainer = (rebind?: RebindCallback): Container => {
    const testContainer = new Container();

    testContainer.bind(SYMBOLS.Logger).toConstantValue(new MockLogger());
    testContainer.bind(SYMBOLS.ConfigProvider).toConstantValue(new MockConfigProvider());
    testContainer.bind(SYMBOLS.IssueReader).toConstantValue(new MockIssueReader());
    testContainer.bind(SYMBOLS.IssueWriter).toConstantValue(new MockIssueWriter());
    testContainer.bind(SYMBOLS.StorageAdapter).toConstantValue(new MockStorageAdapter());
    testContainer.bind(SYMBOLS.VersionControl).toConstantValue(new MockVersionControl());
    testContainer.bind(SYMBOLS.EventBus).toConstantValue(new MockEventBus());
    testContainer.bind(SYMBOLS.IssueTrackerOperations).toConstantValue(new MockIssueTrackerOperations());

    if (rebind) {
        rebind(testContainer);
    }

    return testContainer;
};
