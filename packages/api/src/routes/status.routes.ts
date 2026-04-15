import type { FastifyInstance } from 'fastify';

/**
 * Registers status/health-check routes on the Fastify instance.
 */
export const registerStatusRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/api/status', async (_request, reply) => {
    await reply.send({
      isRunning: true,
      activeIssuesCount: 0,
      uptime: process.uptime(),
    });
  });
};

