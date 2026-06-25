import type { RewardDayProgress } from './daily-reward.model';

export interface CycleRewardDefinition {
  day: number;
  type: 'coins' | 'random' | 'chest';
  coins?: number;
  itemId?: string;
  itemQuantity?: number;
}

export interface ResolvedReward {
  day: number;
  type: 'coins' | 'chest';
  coins?: number;
  itemId?: string;
  itemQuantity?: number;
}

const RANDOM_COIN_MIN = 150;
const RANDOM_COIN_MAX = 350;

export const REWARD_CYCLE: CycleRewardDefinition[] = [
  { day: 1, type: 'coins', coins: 100 },
  { day: 2, type: 'coins', coins: 150 },
  { day: 3, type: 'coins', coins: 200 },
  { day: 4, type: 'random' },
  { day: 5, type: 'coins', coins: 300 },
  { day: 6, type: 'coins', coins: 500 },
  { day: 7, type: 'chest', itemId: 'rare_chest', itemQuantity: 1 },
];

export class RewardResolver {
  getCycle(): readonly CycleRewardDefinition[] {
    return REWARD_CYCLE;
  }

  getRewardForDay(day: number): CycleRewardDefinition {
    const normalized = ((day - 1) % 7) + 1;
    return REWARD_CYCLE.find((entry) => entry.day === normalized) ?? REWARD_CYCLE[0];
  }

  resolveClaim(day: number, rng: () => number = Math.random): ResolvedReward {
    const definition = this.getRewardForDay(day);

    if (definition.type === 'random') {
      const range = RANDOM_COIN_MAX - RANDOM_COIN_MIN + 1;
      const coins = RANDOM_COIN_MIN + Math.floor(rng() * range);
      return { day: definition.day, type: 'coins', coins };
    }

    if (definition.type === 'chest') {
      return {
        day: definition.day,
        type: 'chest',
        itemId: definition.itemId,
        itemQuantity: definition.itemQuantity ?? 1,
      };
    }

    return {
      day: definition.day,
      type: 'coins',
      coins: definition.coins ?? 0,
    };
  }

  getPreviewLabel(day: number): { label: string; type: 'coins' | 'random' | 'chest'; coins?: number } {
    const definition = this.getRewardForDay(day);

    if (definition.type === 'random') {
      return { label: 'random', type: 'random' };
    }

    if (definition.type === 'chest') {
      return { label: 'chest', type: 'chest' };
    }

    return {
      label: String(definition.coins ?? 0),
      type: 'coins',
      coins: definition.coins,
    };
  }

  buildProgress(currentDay: number): RewardDayProgress[] {
    return REWARD_CYCLE.map((entry) => {
      const preview = this.getPreviewLabel(entry.day);
      let status: RewardDayProgress['status'] = 'locked';

      if (entry.day < currentDay) {
        status = 'claimed';
      } else if (entry.day === currentDay) {
        status = 'current';
      }

      return {
        day: entry.day,
        status,
        rewardType: preview.type,
        rewardLabel: preview.label,
        coins: preview.coins,
      };
    });
  }
}

export const rewardResolver = new RewardResolver();
