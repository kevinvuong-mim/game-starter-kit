import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '@platform/core/events';
import { usePlatformStore } from '@platform/core/state';

vi.mock('@platform/core/error', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { MissionService } = await import('./mission.service');

describe('MissionService', () => {
  beforeEach(() => {
    usePlatformStore.getState().reset();
    eventBus.clear();
  });

  it('initializes missions from definitions', () => {
    const missions = new MissionService();
    missions.init();

    const state = usePlatformStore.getState().missions.missions;
    expect(Object.keys(state).length).toBeGreaterThan(0);
    missions.destroy();
  });

  it('increments jump mission progress on jump event', () => {
    const missions = new MissionService();
    missions.init();

    eventBus.emit('jump', { count: 1 });

    const jumpMission = Object.values(usePlatformStore.getState().missions.missions).find(
      (m) => m.type === 'daily'
    );
    expect(jumpMission?.progress).toBeGreaterThanOrEqual(1);
    missions.destroy();
  });
});
