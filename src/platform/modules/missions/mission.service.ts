import missionsData from './missions.json';
import { eventBus } from '@platform/core/events';
import { usePlatformStore } from '@platform/core/state';
import type { MissionType, MissionProgress } from '@platform/core/state';
import { logger } from '@platform/core/error';

export interface MissionDefinition {
  id: string;
  type: string;
  target: number;
  missionType: MissionType;
  reward: { coins?: number; gems?: number };
  titleKey: string;
}

const EVENT_TYPE_MAP: Record<string, string> = {
  jump: 'jump',
  score: 'score:update',
  play: 'game:start',
  collect: 'collect',
};

export class MissionService {
  private definitions: MissionDefinition[] = missionsData as MissionDefinition[];
  private unsubscribers: Array<() => void> = [];

  init(): void {
    this.initializeMissions();
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
    if (def?.reward.gems) store.addGems(def.reward.gems);

    store.claimMission(id);
    return true;
  }

  private initializeMissions(): void {
    const missions: Record<string, MissionProgress> = {};

    for (const def of this.definitions) {
      missions[def.id] = {
        id: def.id,
        type: def.missionType,
        progress: 0,
        target: def.target,
        status: 'active',
      };
    }

    usePlatformStore.getState().setMissions(missions);
  }

  private bindEvents(): void {
    for (const def of this.definitions) {
      const eventName = EVENT_TYPE_MAP[def.type];
      if (!eventName) continue;

      const unsub = eventBus.on(eventName as 'jump', () => {
        this.incrementProgress(def.id, 1);
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

    eventBus.emit('mission:update', { missionId, progress: mission.progress });
  }
}

export const missions = new MissionService();
