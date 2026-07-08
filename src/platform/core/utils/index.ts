/**
 * Shared time source for platform modules.
 * Centralizes device time so server time can be wired in later.
 */
export function now(): number {
  return Date.now();
}

/** Local calendar day key (`YYYY-MM-DD`). */
export function getLocalDateKey(at: number = now()): string {
  const date = new Date(at);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}
