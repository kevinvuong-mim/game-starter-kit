import type { IEventBus, EventHandler, PlatformEvent, PlatformEventMap } from './types';

type ListenerEntry = {
  once: boolean;
  handler: EventHandler<PlatformEvent>;
};

/**
 * Typed event bus for decoupled communication between game and platform layers.
 */
export class EventBus implements IEventBus {
  private listeners = new Map<PlatformEvent, Set<ListenerEntry>>();

  emit<T extends PlatformEvent>(event: T, payload: PlatformEventMap[T]): void {
    const entries = this.listeners.get(event);
    if (!entries?.size) return;

    const toRemove: ListenerEntry[] = [];

    for (const entry of entries) {
      try {
        void Promise.resolve(entry.handler(payload as PlatformEventMap[PlatformEvent])).catch(
          (error) => {
            console.error(`[EventBus] Handler error for "${event}":`, error);
          }
        );
      } catch (error) {
        console.error(`[EventBus] Handler error for "${event}":`, error);
      }
      if (entry.once) toRemove.push(entry);
    }

    for (const entry of toRemove) {
      entries.delete(entry);
    }
  }

  on<T extends PlatformEvent>(event: T, handler: EventHandler<T>): () => void {
    return this.addListener(event, handler as EventHandler<PlatformEvent>, false);
  }

  off<T extends PlatformEvent>(event: T, handler: EventHandler<T>): void {
    const entries = this.listeners.get(event);
    if (!entries) return;

    for (const entry of entries) {
      if (entry.handler === handler) {
        entries.delete(entry);
        break;
      }
    }
  }

  once<T extends PlatformEvent>(event: T, handler: EventHandler<T>): () => void {
    return this.addListener(event, handler as EventHandler<PlatformEvent>, true);
  }

  clear(): void {
    this.listeners.clear();
  }

  private addListener(
    event: PlatformEvent,
    handler: EventHandler<PlatformEvent>,
    once: boolean
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const entry: ListenerEntry = { handler, once };
    this.listeners.get(event)!.add(entry);

    return () => {
      this.listeners.get(event)?.delete(entry);
    };
  }
}

/** Singleton platform event bus */
export const eventBus = new EventBus();
