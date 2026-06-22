import { describe, it, expect, beforeEach } from 'vitest';
import { usePlatformStore } from '@core/state';

describe('PlatformStore', () => {
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
    store.setHighScore(500);
    store.setHighScore(300);
    expect(usePlatformStore.getState().progress.highScore).toBe(500);
  });

  it('updates mission progress and completes', () => {
    const store = usePlatformStore.getState();
    store.setMissions({
      jump_100: {
        id: 'jump_100',
        type: 'daily',
        progress: 0,
        target: 100,
        status: 'active',
      },
    });

    store.updateMissionProgress('jump_100', 50);
    expect(usePlatformStore.getState().missions.missions.jump_100.progress).toBe(50);

    store.updateMissionProgress('jump_100', 100);
    const mission = usePlatformStore.getState().missions.missions.jump_100;
    expect(mission.status).toBe('completed');
  });

  it('updates settings', () => {
    const store = usePlatformStore.getState();
    store.updateSettings({ language: 'vi', soundEnabled: false });
    const settings = usePlatformStore.getState().settings;
    expect(settings.language).toBe('vi');
    expect(settings.soundEnabled).toBe(false);
  });
});
