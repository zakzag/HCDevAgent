/**
 * In-process typed pub/sub system.
 * Matches 3-interfaces.md §9.
 */
export interface EventBus {
    /** Publish an event to all registered listeners. */
    emit(eventName: string, payload: unknown): void;

    /** Register a listener for an event. */
    on(eventName: string, handler: (payload: unknown) => void): void;

    /** Remove a previously registered listener. */
    off(eventName: string, handler: (payload: unknown) => void): void;
}
