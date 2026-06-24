export interface UserState {
  id: string;
  createdAt: number;
  avatarUrl?: string;
  displayName: string;
  lastLoginAt: number;
}

export interface CurrencyState {
  coins: number;
}

export interface InventoryItem {
  id: string;
  quantity: number;
  equipped?: boolean;
}

export interface InventoryState {
  items: Record<string, InventoryItem>;
}

export interface ProgressState {
  highScore: number;
  currentLevel: number;
  totalGamesPlayed: number;
  unlockedFeatures: string[];
}

export interface SettingsState {
  language: string;
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  graphicsQuality: 'low' | 'high' | 'medium';
}

export type MissionType = 'daily' | 'weekly' | 'permanent';
export type MissionStatus = 'active' | 'claimed' | 'completed';

export interface MissionProgress {
  id: string;
  target: number;
  progress: number;
  type: MissionType;
  completedAt?: number;
  status: MissionStatus;
}

export interface MissionsState {
  lastDailyReset: number;
  lastWeeklyReset: number;
  missions: Record<string, MissionProgress>;
}

export interface DailyRewardState {
  streak: number;
  currentDay: number;
  lastClaimAt: number;
  claimedDays: number[];
}

export interface LeaderboardEntry {
  rank: number;
  score: number;
  playerId: string;
  avatarUrl?: string;
  displayName: string;
}

export interface LeaderboardState {
  lastFetchedAt: number;
  allTime: LeaderboardEntry[];
  playerRank: number;
}

export interface PlatformState {
  user: UserState;
  currency: CurrencyState;
  progress: ProgressState;
  missions: MissionsState;
  settings: SettingsState;
  inventory: InventoryState;
  leaderboard: LeaderboardState;
  dailyRewards: DailyRewardState;
}

export const DEFAULT_STATE: PlatformState = {
  dailyRewards: {
    streak: 0,
    currentDay: 1,
    lastClaimAt: 0,
    claimedDays: [],
  },
  leaderboard: {
    allTime: [],
    playerRank: -1,
    lastFetchedAt: 0,
  },
  missions: {
    missions: {},
    lastDailyReset: 0,
    lastWeeklyReset: 0,
  },
  progress: {
    highScore: 0,
    currentLevel: 1,
    totalGamesPlayed: 0,
    unlockedFeatures: [],
  },
  inventory: { items: {} },
  user: {
    id: '',
    displayName: 'Player',
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  },
  settings: {
    language: 'en',
    soundEnabled: true,
    musicEnabled: true,
    vibrationEnabled: true,
    graphicsQuality: 'medium',
  },
  currency: { coins: 0 },
};
