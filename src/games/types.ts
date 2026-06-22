import type { IEventBus } from '@core/events';

/**
 * Game layer contract. Games implement ONLY gameplay.
 * No direct API, storage, ads, or mission logic.
 */
export interface IGame {
  readonly id: string;
  init(): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export interface GameConfig {
  id: string;
  name: string;
  version: string;
  scenes: string[];
  width?: number;
  height?: number;
}

export abstract class BaseGame implements IGame {
  abstract readonly id: string;
  protected eventBus: IEventBus;
  protected paused = false;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
  }

  abstract init(): Promise<void>;
  abstract start(): void;

  pause(): void {
    this.paused = true;
    this.eventBus.emit('game:pause', undefined);
  }

  resume(): void {
    this.paused = false;
    this.eventBus.emit('game:resume', undefined);
  }

  destroy(): void {
    this.eventBus.emit('game:destroy', undefined);
  }

  protected isPaused(): boolean {
    return this.paused;
  }
}
