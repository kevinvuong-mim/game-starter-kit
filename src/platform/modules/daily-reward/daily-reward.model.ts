export const DAILY_REWARD_MODEL_VERSION = 2;
export const DAILY_REWARD_STORAGE_KEY = 'daily-reward-v2';
export const LEGACY_DAILY_REWARD_STORAGE_KEY = 'daily-rewards';

export interface DailyRewardModel {
  version: number;
  /** Next reward day in the 7-day cycle (1–7). */
  currentDay: number;
  /** Set when clock manipulation is detected; blocks further claims. */
  timeManipulated: boolean;
  /** `Date.now()` at the moment of the last successful claim. */
  lastClaimWallClock: number;
  /** Local calendar date of the last claim (`YYYY-MM-DD`). */
  lastClaimDate: string | null;
  /** `Date.now()` from the previous app session. */
  lastSessionTimestamp: number;
}

export interface LegacyDailyRewardState {
  streak: number;
  currentDay: number;
  lastClaimAt: number;
  claimedDays: number[];
}

export type RewardDayStatus = 'locked' | 'claimed' | 'current';

export interface RewardDayProgress {
  day: number;
  coins?: number;
  rewardLabel: string;
  status: RewardDayStatus;
  rewardType: 'coins' | 'chest' | 'random';
}

export interface RewardProgress {
  canClaim: boolean;
  currentDay: number;
  timeManipulated: boolean;
  days: RewardDayProgress[];
}

export interface ClaimResult {
  day: number;
  coins?: number;
  itemId?: string;
  itemQuantity?: number;
  rewardType: 'chest' | 'coins';
}

export function createDefaultModel(): DailyRewardModel {
  return {
    currentDay: 1,
    lastClaimDate: null,
    lastClaimWallClock: 0,
    timeManipulated: false,
    lastSessionTimestamp: 0,
    version: DAILY_REWARD_MODEL_VERSION,
  };
}

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hasClaimedToday(model: DailyRewardModel, now = new Date()): boolean {
  if (!model.lastClaimDate) return false;
  return model.lastClaimDate === getLocalDateString(now);
}
