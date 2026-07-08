import { getLocalDateKey, now } from '@platform/core/utils';

export type MissionBehaviorType = 'WATCH_AD';

export type MissionStatus = 'active' | 'completed' | 'claimed';

export type MissionResetPolicy = 'daily' | 'weekly' | 'never' | 'repeat';

export interface MissionReward {
  type: 'coins';
  amount: number;
}

export interface MissionDefinition {
  id: string;
  target: number;
  titleKey: string;
  reward: MissionReward;
  descriptionKey?: string;
  resetPolicy?: MissionResetPolicy;
  type: MissionBehaviorType | string;
}

export interface MissionProgress {
  id: string;
  type: string;
  target: number;
  progress: number;
  claimedAt?: number;
  createdAt?: number;
  completedAt?: number;
  status: MissionStatus;
  /** Local calendar day key (`YYYY-MM-DD`) of the last reset. */
  lastResetDayKey?: string | null;
}

export interface MissionsState {
  missions: Record<string, MissionProgress>;
}

export function createMissionProgress(def: MissionDefinition): MissionProgress {
  return {
    id: def.id,
    progress: 0,
    type: def.type,
    createdAt: now(),
    status: 'active',
    target: def.target,
    lastResetDayKey: getLocalDateKey(),
  };
}
