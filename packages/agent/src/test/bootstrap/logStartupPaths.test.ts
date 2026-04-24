import { describe, expect, it } from 'vitest';
import { logStartupPaths } from '../../bootstrap/logStartupPaths.js';
import { createMockConfigProvider } from '../mocks/createMockConfigProvider.js';
import { createMockLogger } from '../mocks/createMockLogger.js';

describe('logStartupPaths', () => {
    it('logs the process cwd and configured repository workspace path', () => {
        const logger = createMockLogger();
        const configProvider = createMockConfigProvider({
            WORKSPACE_PATH: 'E:/projects/AI/AIDEV-TEST',
        });

        logStartupPaths(logger, configProvider, 'E:/projects/AI/HCDevAgent/packages/agent');

        expect(logger.info).toHaveBeenCalledWith('Agent startup paths resolved', {
            processWorkingDirectory: 'E:/projects/AI/HCDevAgent/packages/agent',
            repositoryWorkingDirectory: 'E:/projects/AI/AIDEV-TEST',
            workspacePath: 'E:/projects/AI/AIDEV-TEST',
        });
    });

    it('logs a readable sentinel when the repository workspace path is blank', () => {
        const logger = createMockLogger();
        const configProvider = createMockConfigProvider({
            WORKSPACE_PATH: '   ',
        });

        logStartupPaths(logger, configProvider, 'E:/projects/AI/HCDevAgent/packages/agent');

        expect(logger.info).toHaveBeenCalledWith('Agent startup paths resolved', {
            processWorkingDirectory: 'E:/projects/AI/HCDevAgent/packages/agent',
            repositoryWorkingDirectory: 'not configured',
            workspacePath: 'not configured',
        });
    });
});
