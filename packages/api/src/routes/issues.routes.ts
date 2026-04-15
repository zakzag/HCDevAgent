import type { FastifyInstance } from 'fastify';

/**
 * Registers issue-related routes on the Fastify instance.
 */
export const registerIssueRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/api/issues', async (_request, reply) => {
    await reply.send({ issues: [], total: 0 });
  });

  app.get<{ Params: { key: string } }>('/api/issues/:key', async (request, reply) => {
    const { key } = request.params;
    await reply.send({ issue: null, key });
  });
};

