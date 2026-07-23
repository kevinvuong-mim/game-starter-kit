/** Fruit tiers — index 0 is smallest (spawn pool), 9 is watermelon. */
export interface FruitType {
  id: string;
  name: string;
  /** Physics / visual radius in world pixels. */
  radius: number;
  color: number;
  /** Points awarded when this fruit is created by a merge (or watermelon spawn). */
  mergeScore: number;
}

export const FRUIT_TYPES: FruitType[] = [
  { id: 'grapes', name: 'Grapes', radius: 18, color: 0x8e24aa, mergeScore: 1 },
  { id: 'cherry', name: 'Cherry', radius: 24, color: 0xe53935, mergeScore: 3 },
  { id: 'strawberry', name: 'Strawberry', radius: 30, color: 0xff7043, mergeScore: 6 },
  { id: 'peach', name: 'Peach', radius: 36, color: 0xffab91, mergeScore: 10 },
  { id: 'kiwi', name: 'Kiwi', radius: 44, color: 0x9ccc65, mergeScore: 15 },
  { id: 'tomato', name: 'Tomato', radius: 52, color: 0xf44336, mergeScore: 21 },
  { id: 'orange', name: 'Orange', radius: 62, color: 0xff9800, mergeScore: 28 },
  { id: 'apple', name: 'Apple', radius: 74, color: 0xc62828, mergeScore: 36 },
  { id: 'pineapple', name: 'Pineapple', radius: 88, color: 0xffc107, mergeScore: 45 },
  { id: 'watermelon', name: 'Watermelon', radius: 104, color: 0x43a047, mergeScore: 55 },
];

/** Only the smallest fruits can appear as the next drop. */
export const SPAWN_MAX_LEVEL = 4;

export function fruitTextureKey(level: number): string {
  return `__fruit_${level}`;
}

export function randomSpawnLevel(): number {
  return Math.floor(Math.random() * (SPAWN_MAX_LEVEL + 1));
}
