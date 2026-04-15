import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { registerCorsPlugin } from './plugins/cors.plugin.js';
import { registerWebSocketPlugin } from './plugins/websocket.plugin.js';
import { registerLoggingMiddleware } from './middleware/logging.js';
import { registerIssueRoutes } from './routes/issues.routes.js';
import { registerPlanRoutes } from './routes/plans.routes.js';
import { registerStatusRoutes } from './routes/status.routes.js';

/**
 * Creates and configures the Fastify server instance.
 */
export const createServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: true,
  });

  // Register plugins
  await registerCorsPlugin(app);
  await registerWebSocketPlugin(app);

  // Register middleware
  registerLoggingMiddleware(app);

  // Register routes
  await registerIssueRoutes(app);
  await registerPlanRoutes(app);
  await registerStatusRoutes(app);

  return app;
};

