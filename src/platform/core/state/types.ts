export interface UserState {
  id: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  lastLoginAt: number;
}

export interface CurrencyState {
  coins: number;
  gems: number;
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
  currentLevel: number;
  highScore: number;
  totalGamesPlayed: number;
  unlockedFeatures: string[];
}

export interface SettingsState {
  language: string;
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  graphicsQuality: 'low' | 'medium' | 'high';
}

export type MissionType = 'daily' | 'weekly' | 'permanent';
export type MissionStatus = 'active' | 'completed' | 'claimed';

export interface MissionProgress {
  id: string;
  type: MissionType;
  progress: number;
  target: number;
  status: MissionStatus;
  completedAt?: number;
}

export interface MissionsState {
  missions: Record<string, MissionProgress>;
  lastDailyReset: number;
  lastWeeklyReset: number;
}

export interface DailyRewardState {
  streak: number;
  lastClaimAt: number;
  claimedDays: number[];
  currentDay: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  score: number;
  avatarUrl?: string;
}

export interface LeaderboardState {
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
  playerRanks: Record<string, number>;
  lastFetchedAt: number;
}

export interface PlatformState {
  user: UserState;
  currency: CurrencyState;
  inventory: InventoryState;
  progress: ProgressState;
  settings: SettingsState;
  missions: MissionsState;
  dailyRewards: DailyRewardState;
  leaderboard: LeaderboardState;
}

export const DEFAULT_STATE: PlatformState = {
  user: {
    id: '',
    displayName: 'Player',
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  },
  currency: { coins: 0, gems: 0 },
  inventory: { items: {} },
  progress: {
    currentLevel: 1,
    highScore: 0,
    totalGamesPlayed: 0,
    unlockedFeatures: [],
  },
  settings: {
    language: 'en',
    soundEnabled: true,
    musicEnabled: true,
    vibrationEnabled: true,
    graphicsQuality: 'medium',
  },
  missions: {
    missions: {},
    lastDailyReset: 0,
    lastWeeklyReset: 0,
  },
  dailyRewards: {
    streak: 0,
    lastClaimAt: 0,
    claimedDays: [],
    currentDay: 1,
  },
  leaderboard: {
    daily: [],
    weekly: [],
    allTime: [],
    playerRanks: {},
    lastFetchedAt: 0,
  },
};
