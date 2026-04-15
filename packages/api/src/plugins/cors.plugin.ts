import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

/**
 * Registers the CORS plugin on the Fastify instance.
 */
export const registerCorsPlugin = async (app: FastifyInstance): Promise<void> => {
  await app.register(cors, { origin: true });
};

