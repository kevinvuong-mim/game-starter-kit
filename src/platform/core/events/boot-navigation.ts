export interface BootNavigationTarget {
  sceneKey: string;
  data?: Record<string, unknown>;
}

type BootNavigationResolver = () => BootNavigationTarget;

let resolver: BootNavigationResolver | null = null;

export function registerBootNavigationResolver(fn: BootNavigationResolver): void {
  resolver = fn;
}

export function resolveBootNavigation(): BootNavigationTarget {
  return resolver?.() ?? { sceneKey: 'Home' };
}
