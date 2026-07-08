export { EventBus, eventBus } from './EventBus';
export { AnalyticsEvents } from '../analytics/types';
export type { AnalyticsEvent, AnalyticsParams } from '../analytics/types';
export type { IEventBus, EventHandler, PlatformEvent, PlatformEventMap } from './types';

export interface BootNavigationTarget {
  sceneKey: string;
  data?: Record<string, unknown>;
}

type BootNavigationResolver = () => BootNavigationTarget;

let resolver: BootNavigationResolver | null = null;

export function registerBootNavigationResolver(fn: BootNavigationResolver): void {
  resolver = fn;
}

/** Read pending boot destination without side effects (no markBootComplete). */
export function getBootNavigationTarget(): BootNavigationTarget {
  return resolver?.() ?? { sceneKey: 'Home' };
}
