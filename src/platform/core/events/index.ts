export { eventBus } from './EventBus';
export type { IEventBus } from './types';
export { AnalyticsEvents } from '../analytics/types';

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
