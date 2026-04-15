import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';

/**
 * Registers the WebSocket plugin on the Fastify instance.
 */
export const registerWebSocketPlugin = async (app: FastifyInstance): Promise<void> => {
  await app.register(websocket);
};

