import 'reflect-metadata';
import { container } from './container.js';
import { Conductor } from './conductor/Conductor.js';
import { logStartupPaths } from './bootstrap/logStartupPaths.js';
import { SYMBOLS } from '@hcdevagent/shared';
import type { ConfigProvider, Logger } from '@hcdevagent/shared';

/**
 * CLI entry point for the HCDevAgent agent.
 * Resolves the Conductor from the DI container and starts the polling loop.
 * Handles graceful shutdown on SIGINT/SIGTERM.
 */
const main = async (): Promise<void> => {
    const logger = container.get<Logger>(SYMBOLS.Logger);
    const configProvider = container.get<ConfigProvider>(SYMBOLS.ConfigProvider);
    logStartupPaths(logger, configProvider);
    const conductor = container.get<Conductor>(SYMBOLS.Conductor);

    const shutdown = async (): Promise<void> => {
        logger.info('Shutdown signal received');
        await conductor.stop();
        process.exit(0);
    };

    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());

    try {
        logger.info('HCDevAgent starting');
        await conductor.start();
    } catch (error) {
        logger.error('Fatal error starting agent', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
    }
};

void main();

