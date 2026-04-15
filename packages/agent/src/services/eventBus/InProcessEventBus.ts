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
  public publish(eventName: string, payload: unknown): void {
    const eventHandlers = this.handlers.get(eventName);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        handler(payload);
      }
    }
  }

  /** Subscribes a handler to a specific event. */
  public subscribe(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler);
  }

  /** Unsubscribes a handler from a specific event. */
  public unsubscribe(eventName: string, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(eventName);
    if (eventHandlers) {
      eventHandlers.delete(handler);
    }
  }
}

