import 'reflect-metadata';
import { Container } from 'inversify';

/**
 * API-level DI container.
 * Can extend the agent container with API-specific bindings.
 */
const apiContainer = new Container();

export { apiContainer };

