import { getLocalDateKey, now } from '@platform/core/utils/time';

export type MissionStatus = 'active' | 'completed' | 'claimed';

export type MissionResetPolicy = 'daily' | 'weekly' | 'never' | 'repeat';

export type MissionBehaviorType = 'WATCH_AD';

export interface MissionReward {
  type: 'coins';
  amount: number;
}

export interface MissionDefinition {
  id: string;
  type: MissionBehaviorType | string;
  target: number;
  titleKey: string;
  descriptionKey?: string;
  resetPolicy?: MissionResetPolicy;
  reward: MissionReward;
}

export interface MissionProgress {
  id: string;
  type: string;
  target: number;
  progress: number;
  status: MissionStatus;
  createdAt?: number;
  completedAt?: number;
  claimedAt?: number;
  /** Local calendar day key (`YYYY-MM-DD`) of the last reset. */
  lastResetDayKey?: string | null;
}

export interface MissionsState {
  missions: Record<string, MissionProgress>;
}

export function createMissionProgress(def: MissionDefinition): MissionProgress {
  return {
    id: def.id,
    type: def.type,
    target: def.target,
    progress: 0,
    status: 'active',
    createdAt: now(),
    lastResetDayKey: getLocalDateKey(),
  };
}
