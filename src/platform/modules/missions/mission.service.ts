import missionsData from './missions.json';
import { logger } from '@platform/core/error';
import { eventBus } from '@platform/core/events';
import { usePlatformStore } from '@platform/core/state';
import { saveService } from '@platform/modules/save/save.service';
import type { MissionType, MissionProgress } from '@platform/core/state';

export interface MissionDefinition {
  id: string;
  type: string;
  target: number;
  titleKey: string;
  missionType: MissionType;
  reward: { coins?: number };
}

const EVENT_TYPE_MAP: Record<string, string> = {
  jump: 'jump',
  play: 'game:start',
  collect: 'collect',
  score: 'score:update',
};

function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function startOfUtcWeek(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  monday.setUTCDate(monday.getUTCDate() - daysFromMonday);
  return monday.getTime();
}

export class MissionService {
  private definitions: MissionDefinition[] = missionsData as MissionDefinition[];
  private unsubscribers: Array<() => void> = [];

  init(): void {
    this.initializeMissions();
    void this.applyResets();
    this.bindEvents();
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }

  getMissions(type?: MissionType): MissionProgress[] {
    const missions = usePlatformStore.getState().missions.missions;
    const entries = Object.values(missions);
    if (!type) return entries;
    return entries.filter((m) => m.type === type);
  }

  getDefinition(id: string): MissionDefinition | undefined {
    return this.definitions.find((d) => d.id === id);
  }

  claimMission(id: string): boolean {
    const store = usePlatformStore.getState();
    const mission = store.missions.missions[id];
    if (!mission || mission.status !== 'completed') return false;

    const def = this.getDefinition(id);
    if (def?.reward.coins) store.addCoins(def.reward.coins);

    store.claimMission(id);
    return true;
  }

  private initializeMissions(): void {
    const existing = usePlatformStore.getState().missions.missions;
    const missions: Record<string, MissionProgress> = { ...existing };

    for (const def of this.definitions) {
      const saved = missions[def.id];
      if (saved) {
        missions[def.id] = {
          ...saved,
          type: def.missionType,
          target: def.target,
        };
      } else {
        missions[def.id] = {
          id: def.id,
          type: def.missionType,
          progress: 0,
          target: def.target,
          status: 'active',
        };
      }
    }

    usePlatformStore.getState().setMissions(missions);
  }

  private async applyResets(): Promise<void> {
    const { missions, lastDailyReset, lastWeeklyReset } = usePlatformStore.getState().missions;
    const now = Date.now();
    let updatedMissions = { ...missions };
    let nextDailyReset = lastDailyReset;
    let nextWeeklyReset = lastWeeklyReset;
    let didReset = false;

    if (lastDailyReset === 0) {
      nextDailyReset = now;
    } else if (startOfUtcDay(lastDailyReset) < startOfUtcDay(now)) {
      updatedMissions = this.resetMissionsOfType(updatedMissions, 'daily');
      nextDailyReset = now;
      didReset = true;
      logger.info('[Missions] Daily missions reset');
    }

    if (lastWeeklyReset === 0) {
      nextWeeklyReset = now;
    } else if (startOfUtcWeek(lastWeeklyReset) < startOfUtcWeek(now)) {
      updatedMissions = this.resetMissionsOfType(updatedMissions, 'weekly');
      nextWeeklyReset = now;
      didReset = true;
      logger.info('[Missions] Weekly missions reset');
    }

    if (
      nextDailyReset !== lastDailyReset ||
      nextWeeklyReset !== lastWeeklyReset ||
      updatedMissions !== missions
    ) {
      usePlatformStore.getState().updateMissionsState({
        missions: updatedMissions,
        lastDailyReset: nextDailyReset,
        lastWeeklyReset: nextWeeklyReset,
      });
    }

    if (didReset) {
      await saveService.saveLocal();
    }
  }

  private resetMissionsOfType(
    missions: Record<string, MissionProgress>,
    type: MissionType
  ): Record<string, MissionProgress> {
    const result = { ...missions };

    for (const def of this.definitions.filter((d) => d.missionType === type)) {
      result[def.id] = {
        id: def.id,
        type,
        progress: 0,
        target: def.target,
        status: 'active',
      };
    }

    return result;
  }

  private bindEvents(): void {
    for (const def of this.definitions) {
      if (def.type === 'score') continue;

      const eventName = EVENT_TYPE_MAP[def.type];
      if (!eventName) continue;

      const unsub = eventBus.on(eventName as 'jump', (payload) => {
        const count = 'count' in payload ? (payload.count ?? 1) : 1;
        this.incrementProgress(def.id, count);
      });

      this.unsubscribers.push(unsub);
    }

    const scoreUnsub = eventBus.on('score:update', (payload) => {
      for (const def of this.definitions.filter((d) => d.type === 'score')) {
        const mission = usePlatformStore.getState().missions.missions[def.id];
        if (mission && mission.status === 'active') {
          usePlatformStore.getState().updateMissionProgress(def.id, payload.score);
          this.checkCompletion(def.id);
        }
      }
    });
    this.unsubscribers.push(scoreUnsub);
  }

  private incrementProgress(missionId: string, amount: number): void {
    const mission = usePlatformStore.getState().missions.missions[missionId];
    if (!mission || mission.status !== 'active') return;

    usePlatformStore.getState().updateMissionProgress(missionId, mission.progress + amount);
    this.checkCompletion(missionId);
  }

  private checkCompletion(missionId: string): void {
    const mission = usePlatformStore.getState().missions.missions[missionId];
    if (!mission) return;

    if (mission.progress >= mission.target && mission.status === 'active') {
      usePlatformStore.getState().completeMission(missionId);
      eventBus.emit('mission:complete', { missionId });
      logger.info(`[Missions] Completed: ${missionId}`);
    }

    const updated = usePlatformStore.getState().missions.missions[missionId];
    if (updated) {
      eventBus.emit('mission:update', { missionId, progress: updated.progress });
    }
  }
}

export const missions = new MissionService();
