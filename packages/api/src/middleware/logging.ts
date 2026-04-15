import type {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';

/**
 * Registers a request logging hook on the Fastify instance.
 */
export const registerLoggingMiddleware = (app: FastifyInstance): void => {
    app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
        request.log.info({method: request.method, url: request.url}, 'Incoming request');
    });

    app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
        request.log.info(
            {method: request.method, url: request.url, statusCode: reply.statusCode},
            'Request completed',
        );
    });
};

