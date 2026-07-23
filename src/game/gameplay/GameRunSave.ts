const STORAGE_KEY = 'gsk:gameplay-run';

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

function readSession(): GameRunSnapshot | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameRunSnapshot;
    if (parsed?.version !== 1 || !Array.isArray(parsed.fruits)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(snapshot: GameRunSnapshot | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (!snapshot) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Best-effort — memory still holds the run.
  }
}

export function hasGameRunSave(): boolean {
  return memory != null || readSession() != null;
}

export function loadGameRunSave(): GameRunSnapshot | null {
  if (memory) return memory;
  memory = readSession();
  return memory;
}

export function saveGameRun(snapshot: GameRunSnapshot): void {
  memory = snapshot;
  writeSession(snapshot);
}

export function clearGameRunSave(): void {
  memory = null;
  writeSession(null);
}

/** True when leaving would discard progress the player expects to keep. */
export function isMeaningfulRun(snapshot: Pick<GameRunSnapshot, 'score' | 'sessionStarted' | 'fruits'>): boolean {
  return snapshot.sessionStarted || snapshot.score > 0 || snapshot.fruits.length > 0;
}
