import 'reflect-metadata';
import { createServer } from './server.js';

/**
 * CLI entry point for the HCDevAgent API server.
 * Creates and starts the Fastify server.
 */
const main = async (): Promise<void> => {
    try {
        const app = await createServer();
        const port = process.env.PORT ? Number(process.env.PORT) : 3000;
        const host = process.env.HOST ?? '0.0.0.0';

        await app.listen({ port, host });
        console.log(`✓ API server listening at http://${host}:${port}`);
    } catch (error) {
        console.error('✗ Failed to start API server:', error);
        process.exit(1);
    }
};

void main();

