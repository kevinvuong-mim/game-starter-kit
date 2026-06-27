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

export type MissionStatus = 'active' | 'claimed' | 'completed';

export interface MissionProgress {
  id: string;
  target: number;
  progress: number;
  type: string;
  createdAt?: number;
  completedAt?: number;
  claimedAt?: number;
  lastResetDayKey?: string | null;
  status: MissionStatus;
}

export interface MissionsState {
  missions: Record<string, MissionProgress>;
}

export interface DailyRewardState {
  version: number;
  currentDay: number;
  lastClaimDate: string | null;
  lastClaimWallClock: number;
  lastSessionTimestamp: number;
  timeManipulated: boolean;
  /** @deprecated Legacy field — used only for save migration. */
  streak?: number;
  /** @deprecated Legacy field — used only for save migration. */
  lastClaimAt?: number;
  /** @deprecated Legacy field — used only for save migration. */
  claimedDays?: number[];
}

export interface PlatformState {
  user: UserState;
  currency: CurrencyState;
  progress: ProgressState;
  missions: MissionsState;
  settings: SettingsState;
  inventory: InventoryState;
  dailyRewards: DailyRewardState;
}

export const DEFAULT_STATE: PlatformState = {
  dailyRewards: {
    version: 2,
    currentDay: 1,
    lastClaimDate: null,
    lastClaimWallClock: 0,
    lastSessionTimestamp: 0,
    timeManipulated: false,
  },
  missions: {
    missions: {},
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
