import type { ConfigProvider, Logger } from '@hcdevagent/shared';

const UNCONFIGURED_WORKSPACE_PATH = 'not configured';

const normalizeWorkspacePath = (workspacePath: string | undefined): string | undefined => {
    if (workspacePath === undefined) {
        return undefined;
    }

    const normalized = workspacePath.trim();
    return normalized === '' ? undefined : normalized;
};

/**
 * Logs the agent process cwd separately from the configured repository workspace path
 * so startup diagnostics clearly show both execution contexts.
 */
export const logStartupPaths = (
    logger: Logger,
    configProvider: ConfigProvider,
    processWorkingDirectory: string = process.cwd(),
): void => {
    const workspacePath = normalizeWorkspacePath(configProvider.getOptional('WORKSPACE_PATH'));

    logger.info('Agent startup paths resolved', {
        processWorkingDirectory,
        repositoryWorkingDirectory: workspacePath ?? UNCONFIGURED_WORKSPACE_PATH,
        workspacePath: workspacePath ?? UNCONFIGURED_WORKSPACE_PATH,
    });
};
