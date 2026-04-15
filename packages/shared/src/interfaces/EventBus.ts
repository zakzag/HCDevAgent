/**
 * In-process event bus for decoupled communication between modules.
 */
export interface EventBus {
  /** Publishes an event with an optional payload. */
  publish(eventName: string, payload: unknown): void;

  /** Subscribes a handler to an event. */
  subscribe(eventName: string, handler: (payload: unknown) => void): void;

  /** Unsubscribes a handler from an event. */
  unsubscribe(eventName: string, handler: (payload: unknown) => void): void;
}

