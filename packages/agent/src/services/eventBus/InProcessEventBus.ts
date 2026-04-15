import { injectable } from 'inversify';
import type { EventBus } from '@hcdevagent/shared';

/** Handler function type for event bus subscriptions. */
type EventHandler = (payload: unknown) => void;

/**
 * Simple in-process event bus using a Map of event handlers.
 */
@injectable()
export class InProcessEventBus implements EventBus {
    private readonly handlers: Map<string, Set<EventHandler>> = new Map();

    /** Publishes an event to all registered handlers. */
    public emit(eventName: string, payload: unknown): void {
        const eventHandlers = this.handlers.get(eventName);
        if (eventHandlers) {
            for (const handler of eventHandlers) {
                handler(payload);
            }
        }
    }

    /** Registers a handler for a specific event. */
    public on(eventName: string, handler: EventHandler): void {
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, new Set());
        }
        this.handlers.get(eventName)!.add(handler);
    }

    /** Removes a handler from a specific event. */
    public off(eventName: string, handler: EventHandler): void {
        const eventHandlers = this.handlers.get(eventName);
        if (eventHandlers) {
            eventHandlers.delete(handler);
        }
    }
}
