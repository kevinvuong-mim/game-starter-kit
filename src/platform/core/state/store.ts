import { createStore } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PlatformState } from './types';
import { DEFAULT_STATE } from './types';

export interface PlatformStore extends PlatformState {
  // User
  setUser: (user: Partial<PlatformState['user']>) => void;

  // Currency
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;

  // Inventory
  addItem: (id: string, quantity?: number) => void;
  removeItem: (id: string, quantity?: number) => void;
  equipItem: (id: string) => void;

  // Progress
  setHighScore: (score: number) => void;
  incrementGamesPlayed: () => void;
  setCurrentLevel: (level: number) => void;

  // Settings
  updateSettings: (settings: Partial<PlatformState['settings']>) => void;

  // Missions
  updateMissionProgress: (id: string, progress: number) => void;
  completeMission: (id: string) => void;
  claimMission: (id: string) => void;
  setMissions: (missions: PlatformState['missions']['missions']) => void;

  // Daily rewards
  claimDailyReward: (day: number) => void;
  setDailyRewardState: (state: Partial<PlatformState['dailyRewards']>) => void;

  // Leaderboard
  setLeaderboard: (
    board: 'daily' | 'weekly' | 'allTime',
    entries: PlatformState['leaderboard']['daily']
  ) => void;
  setPlayerRank: (board: string, rank: number) => void;

  // Bulk
  hydrate: (state: Partial<PlatformState>) => void;
  reset: () => void;
}

const memoryStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};

function getStorage(): Storage {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : memoryStorage;
  } catch {
    return memoryStorage;
  }
}

export const usePlatformStore = createStore<PlatformStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setUser: (user) => set((s) => ({ user: { ...s.user, ...user } })),

      addCoins: (amount) =>
        set((s) => ({ currency: { ...s.currency, coins: s.currency.coins + amount } })),

      spendCoins: (amount) => {
        const { currency } = get();
        if (currency.coins < amount) return false;
        set((s) => ({
          currency: { ...s.currency, coins: s.currency.coins - amount },
        }));
        return true;
      },

      addGems: (amount) =>
        set((s) => ({ currency: { ...s.currency, gems: s.currency.gems + amount } })),

      spendGems: (amount) => {
        const { currency } = get();
        if (currency.gems < amount) return false;
        set((s) => ({
          currency: { ...s.currency, gems: s.currency.gems - amount },
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

      setCurrentLevel: (level) =>
        set((s) => ({ progress: { ...s.progress, currentLevel: level } })),

      updateSettings: (settings) => set((s) => ({ settings: { ...s.settings, ...settings } })),

      updateMissionProgress: (id, progress) =>
        set((s) => {
          const mission = s.missions.missions[id];
          if (!mission) return s;
          const capped = Math.min(progress, mission.target);
          const completed = capped >= mission.target;
          return {
            missions: {
              ...s.missions,
              missions: {
                ...s.missions.missions,
                [id]: {
                  ...mission,
                  progress: capped,
                  status: completed ? 'completed' : mission.status,
                  completedAt: completed ? Date.now() : mission.completedAt,
                },
              },
            },
          };
        }),

      completeMission: (id) =>
        set((s) => {
          const mission = s.missions.missions[id];
          if (!mission) return s;
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

      claimDailyReward: (day) =>
        set((s) => ({
          dailyRewards: {
            ...s.dailyRewards,
            lastClaimAt: Date.now(),
            streak: s.dailyRewards.streak + 1,
            claimedDays: [...s.dailyRewards.claimedDays, day],
            currentDay: day + 1,
          },
        })),

      setDailyRewardState: (state) =>
        set((s) => ({ dailyRewards: { ...s.dailyRewards, ...state } })),

      setLeaderboard: (board, entries) =>
        set((s) => ({
          leaderboard: {
            ...s.leaderboard,
            [board]: entries,
            lastFetchedAt: Date.now(),
          },
        })),

      setPlayerRank: (board, rank) =>
        set((s) => ({
          leaderboard: {
            ...s.leaderboard,
            playerRanks: { ...s.leaderboard.playerRanks, [board]: rank },
          },
        })),

      hydrate: (state) => set((s) => ({ ...s, ...state })),

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'platform-store',
      storage: createJSONStorage(() => getStorage()),
      partialize: (state) => ({
        user: state.user,
        currency: state.currency,
        inventory: state.inventory,
        progress: state.progress,
        settings: state.settings,
        missions: state.missions,
        dailyRewards: state.dailyRewards,
      }),
    }
  )
);

export function getStoreState(): PlatformState {
  return usePlatformStore.getState();
}
