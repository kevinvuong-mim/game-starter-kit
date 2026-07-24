import {
  clearPersistedGameRun,
  getPersistedGameRun,
  setPersistedGameRun,
} from '@platform/ui/gameRun';

const LEGACY_SESSION_KEY = 'gsk:gameplay-run';

export type SavedFruit = {
  x: number;
  y: number;
  level: number;
  scoreMultiplier: number;
  vx: number;
  vy: number;
  angularVelocity: number;
};

export type GameRunSnapshot = {
  version: 1;
  score: number;
  merges: number;
  elapsedMs: number;
  sessionStarted: boolean;
  currentLevel: number;
  nextLevel: number;
  dropperX: number;
  fruits: SavedFruit[];
};

let memory: GameRunSnapshot | null = null;

function isGameRunSnapshot(value: unknown): value is GameRunSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snap = value as GameRunSnapshot;
  return snap.version === 1 && Array.isArray(snap.fruits);
}

function readLegacySession(): GameRunSnapshot | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isGameRunSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function clearLegacySession(): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function hasGameRunSave(): boolean {
  return loadGameRunSave() != null;
}

export function loadGameRunSave(): GameRunSnapshot | null {
  if (memory) return memory;

  const persisted = getPersistedGameRun();
  if (isGameRunSnapshot(persisted)) {
    memory = persisted;
    return memory;
  }

  // One-time migration from the old sessionStorage-only save.
  const legacy = readLegacySession();
  if (legacy) {
    memory = legacy;
    setPersistedGameRun(legacy);
    clearLegacySession();
    return memory;
  }

  return null;
}

export function saveGameRun(snapshot: GameRunSnapshot): void {
  memory = snapshot;
  setPersistedGameRun(snapshot);
  clearLegacySession();
}

export function clearGameRunSave(): void {
  memory = null;
  clearPersistedGameRun();
  clearLegacySession();
}

/** True when leaving would discard progress the player expects to keep. */
export function isMeaningfulRun(
  snapshot: Pick<GameRunSnapshot, 'score' | 'sessionStarted' | 'fruits'>
): boolean {
  return snapshot.sessionStarted || snapshot.score > 0 || snapshot.fruits.length > 0;
}
