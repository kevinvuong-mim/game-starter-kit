export const DAILY_REWARD_STORAGE_KEY = 'daily-reward-v2';
export const LEGACY_DAILY_REWARD_STORAGE_KEY = 'daily-rewards';
export const DAILY_REWARD_MODEL_VERSION = 2;

export interface DailyRewardModel {
  version: number;
  /** Next reward day in the 7-day cycle (1–7). */
  currentDay: number;
  /** Local calendar date of the last claim (`YYYY-MM-DD`). */
  lastClaimDate: string | null;
  /** `Date.now()` at the moment of the last successful claim. */
  lastClaimWallClock: number;
  /** `Date.now()` from the previous app session. */
  lastSessionTimestamp: number;
  /** Set when clock manipulation is detected; blocks further claims. */
  timeManipulated: boolean;
}

export interface LegacyDailyRewardState {
  streak: number;
  currentDay: number;
  lastClaimAt: number;
  claimedDays: number[];
}

export type RewardDayStatus = 'claimed' | 'current' | 'locked';

export interface RewardDayProgress {
  day: number;
  status: RewardDayStatus;
  rewardLabel: string;
  rewardType: 'coins' | 'random' | 'chest';
  coins?: number;
}

export interface RewardProgress {
  currentDay: number;
  canClaim: boolean;
  timeManipulated: boolean;
  days: RewardDayProgress[];
}

export interface ClaimResult {
  day: number;
  rewardType: 'coins' | 'chest';
  coins?: number;
  itemId?: string;
  itemQuantity?: number;
}

export function createDefaultModel(): DailyRewardModel {
  return {
    version: DAILY_REWARD_MODEL_VERSION,
    currentDay: 1,
    lastClaimDate: null,
    lastClaimWallClock: 0,
    lastSessionTimestamp: 0,
    timeManipulated: false,
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
