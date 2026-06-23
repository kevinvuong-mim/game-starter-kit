import { logger } from '@platform/core/error';
import { apiClient } from '@platform/core/api';
import { storage } from '@platform/core/storage';
import { eventBus } from '@platform/core/events';
import { usePlatformStore } from '@platform/core/state';
import type { DailyRewardState } from '@platform/core/state';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DAILY_REWARD_KEY = 'daily-rewards';

export interface DailyRewardDay {
  day: number;
  reward: { coins?: number; gems?: number };
}

const REWARD_CALENDAR: DailyRewardDay[] = [
  { day: 1, reward: { coins: 10 } },
  { day: 2, reward: { coins: 20 } },
  { day: 3, reward: { coins: 30 } },
  { day: 4, reward: { coins: 50 } },
  { day: 5, reward: { gems: 1 } },
  { day: 6, reward: { coins: 75 } },
  { day: 7, reward: { gems: 5 } },
];

export class DailyRewardService {
  async init(): Promise<void> {
    const saved = await storage.load<DailyRewardState>(DAILY_REWARD_KEY);
    if (saved) {
      usePlatformStore.getState().setDailyRewardState(saved);
    }
  }

  getCalendar(): DailyRewardDay[] {
    return REWARD_CALENDAR;
  }

  canClaim(): boolean {
    const { lastClaimAt } = usePlatformStore.getState().dailyRewards;
    if (!lastClaimAt) return true;
    return Date.now() - lastClaimAt >= COOLDOWN_MS;
  }

  getCooldownRemaining(): number {
    const { lastClaimAt } = usePlatformStore.getState().dailyRewards;
    if (!lastClaimAt) return 0;
    const remaining = COOLDOWN_MS - (Date.now() - lastClaimAt);
    return Math.max(0, remaining);
  }

  async getServerTimestamp(): Promise<number> {
    try {
      const { timestamp } = await apiClient.get<{ timestamp: number }>('/time');
      return timestamp;
    } catch {
      return Date.now();
    }
  }

  async claim(): Promise<DailyRewardDay | null> {
    if (!this.canClaim()) {
      logger.warn('[DailyReward] Cooldown active');
      return null;
    }

    const store = usePlatformStore.getState();
    const currentDay = store.dailyRewards.currentDay;
    const rewardDay = REWARD_CALENDAR.find((r) => r.day === currentDay) ?? REWARD_CALENDAR[0];

    if (rewardDay.reward.coins) store.addCoins(rewardDay.reward.coins);
    if (rewardDay.reward.gems) store.addGems(rewardDay.reward.gems);

    const newStreak = store.dailyRewards.streak + 1;
    store.claimDailyReward(rewardDay.day);

    await storage.save(DAILY_REWARD_KEY, store.dailyRewards);

    eventBus.emit('daily:claim', { day: rewardDay.day, streak: newStreak });
    logger.info(`[DailyReward] Claimed day ${rewardDay.day}, streak: ${newStreak}`);

    return rewardDay;
  }
}

export const dailyRewards = new DailyRewardService();
