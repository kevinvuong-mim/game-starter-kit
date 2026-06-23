import { it, expect, describe, beforeEach } from 'vitest';

import { usePlatformStore } from './store';

describe('usePlatformStore', () => {
  beforeEach(() => {
    usePlatformStore.getState().reset();
  });

  it('adds and spends coins', () => {
    const store = usePlatformStore.getState();
    store.addCoins(100);
    expect(usePlatformStore.getState().currency.coins).toBe(100);

    const spent = store.spendCoins(30);
    expect(spent).toBe(true);
    expect(usePlatformStore.getState().currency.coins).toBe(70);
  });

  it('rejects spend when insufficient coins', () => {
    const store = usePlatformStore.getState();
    store.addCoins(10);

    const spent = store.spendCoins(50);
    expect(spent).toBe(false);
    expect(usePlatformStore.getState().currency.coins).toBe(10);
  });

  it('tracks high score', () => {
    const store = usePlatformStore.getState();
    store.setHighScore(50);
    store.setHighScore(30);
    expect(usePlatformStore.getState().progress.highScore).toBe(50);
  });

  it('increments games played', () => {
    const store = usePlatformStore.getState();
    store.incrementGamesPlayed();
    store.incrementGamesPlayed();
    expect(usePlatformStore.getState().progress.totalGamesPlayed).toBe(2);
  });
});
