import type { FastifyInstance } from 'fastify';

/**
 * Registers plan-related routes on the Fastify instance.
 */
export const registerPlanRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get<{ Params: { key: string } }>('/api/plans/:key', async (request, reply) => {
    const { key } = request.params;
    await reply.send({ plan: null, key });
  });
};

