import { createStore } from 'zustand/vanilla';

import { DEFAULT_STATE } from './types';
import type { PlatformState } from './types';

export interface PlatformStore extends PlatformState {
  // User
  setUser: (user: Partial<PlatformState['user']>) => void;

  // Currency
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;

  // Inventory
  equipItem: (id: string) => void;
  addItem: (id: string, quantity?: number) => void;
  removeItem: (id: string, quantity?: number) => void;

  // Progress
  incrementGamesPlayed: () => void;
  setHighScore: (score: number) => void;
  setCurrentLevel: (level: number) => void;

  // Settings
  updateSettings: (settings: Partial<PlatformState['settings']>) => void;

  // Missions
  claimMission: (id: string) => void;
  completeMission: (id: string) => void;
  updateMissionProgress: (id: string, progress: number) => void;
  setMissions: (missions: PlatformState['missions']['missions']) => void;
  updateMissionsState: (
    update: Partial<
      Pick<PlatformState['missions'], 'missions' | 'lastDailyReset' | 'lastWeeklyReset'>
    >
  ) => void;

  // Daily rewards
  claimDailyReward: (day: number) => void;
  setDailyRewardState: (state: Partial<PlatformState['dailyRewards']>) => void;

  // Leaderboard
  setLeaderboard: (entries: PlatformState['leaderboard']['allTime']) => void;
  setPlayerRank: (rank: number) => void;

  // Bulk
  hydrate: (state: Partial<PlatformState>) => void;
  reset: () => void;
}

export const usePlatformStore = createStore<PlatformStore>()((set, get) => ({
  ...DEFAULT_STATE,

  setUser: (user) => set((s) => ({ user: { ...s.user, ...user } })),

  addCoins: (amount) => {
    if (amount <= 0) return;
    set((s) => ({ currency: { ...s.currency, coins: s.currency.coins + amount } }));
  },

  spendCoins: (amount) => {
    if (amount <= 0) return false;
    const { currency } = get();
    if (currency.coins < amount) return false;
    set((s) => ({
      currency: { ...s.currency, coins: s.currency.coins - amount },
    }));
    return true;
  },

  addItem: (id, quantity = 1) =>
    set((s) => {
      const existing = s.inventory.items[id];
      return {
        inventory: {
          items: {
            ...s.inventory.items,
            [id]: {
              id,
              quantity: (existing?.quantity ?? 0) + quantity,
              equipped: existing?.equipped,
            },
          },
        },
      };
    }),

  removeItem: (id, quantity = 1) =>
    set((s) => {
      const existing = s.inventory.items[id];
      if (!existing) return s;
      const newQty = Math.max(0, existing.quantity - quantity);
      const items = { ...s.inventory.items };
      if (newQty === 0) {
        delete items[id];
      } else {
        items[id] = { ...existing, quantity: newQty };
      }
      return { inventory: { items } };
    }),

  equipItem: (id) =>
    set((s) => {
      const items = { ...s.inventory.items };
      for (const key of Object.keys(items)) {
        if (items[key].equipped) {
          items[key] = { ...items[key], equipped: false };
        }
      }
      if (items[id]) {
        items[id] = { ...items[id], equipped: true };
      }
      return { inventory: { items } };
    }),

  setHighScore: (score) =>
    set((s) => ({
      progress: {
        ...s.progress,
        highScore: Math.max(s.progress.highScore, score),
      },
    })),

  incrementGamesPlayed: () =>
    set((s) => ({
      progress: {
        ...s.progress,
        totalGamesPlayed: s.progress.totalGamesPlayed + 1,
      },
    })),

  setCurrentLevel: (level) => set((s) => ({ progress: { ...s.progress, currentLevel: level } })),

  updateSettings: (settings) => set((s) => ({ settings: { ...s.settings, ...settings } })),

  updateMissionProgress: (id, progress) =>
    set((s) => {
      const mission = s.missions.missions[id];
      if (!mission || mission.status !== 'active') return s;
      const capped = Math.min(progress, mission.target);
      return {
        missions: {
          ...s.missions,
          missions: {
            ...s.missions.missions,
            [id]: {
              ...mission,
              progress: capped,
            },
          },
        },
      };
    }),

  completeMission: (id) =>
    set((s) => {
      const mission = s.missions.missions[id];
      if (!mission || mission.status !== 'active') return s;
      return {
        missions: {
          ...s.missions,
          missions: {
            ...s.missions.missions,
            [id]: {
              ...mission,
              progress: mission.target,
              status: 'completed',
              completedAt: Date.now(),
            },
          },
        },
      };
    }),

  claimMission: (id) =>
    set((s) => {
      const mission = s.missions.missions[id];
      if (!mission || mission.status !== 'completed') return s;
      return {
        missions: {
          ...s.missions,
          missions: {
            ...s.missions.missions,
            [id]: { ...mission, status: 'claimed' },
          },
        },
      };
    }),

  setMissions: (missions) => set((s) => ({ missions: { ...s.missions, missions } })),

  updateMissionsState: (update) =>
    set((s) => ({
      missions: { ...s.missions, ...update },
    })),

  claimDailyReward: (day) =>
    set((s) => ({
      dailyRewards: {
        ...s.dailyRewards,
        lastClaimAt: Date.now(),
        streak: s.dailyRewards.streak + 1,
        claimedDays: day >= 7 ? [] : [...s.dailyRewards.claimedDays, day],
        currentDay: day >= 7 ? 1 : day + 1,
      },
    })),

  setDailyRewardState: (state) => set((s) => ({ dailyRewards: { ...s.dailyRewards, ...state } })),

  setLeaderboard: (entries) =>
    set((s) => ({
      leaderboard: {
        ...s.leaderboard,
        allTime: entries,
        lastFetchedAt: Date.now(),
      },
    })),

  setPlayerRank: (rank) =>
    set((s) => ({
      leaderboard: {
        ...s.leaderboard,
        playerRank: rank,
      },
    })),

  hydrate: (state) => set((s) => ({ ...s, ...state })),

  reset: () => set(DEFAULT_STATE),
}));

export function getStoreState(): PlatformState {
  return usePlatformStore.getState();
}
