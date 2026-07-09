export const NOTIFICATION_STORAGE_KEY = 'notification-state-v1';

export const MAX_DEVICE_SYNC_ATTEMPTS = 10;
export const BASE_DEVICE_SYNC_BACKOFF_MS = 30_000;
export const MAX_DEVICE_SYNC_BACKOFF_MS = 30 * 60 * 1000;

export const NOTIFICATION_IDS = {
  DAILY_REWARD: 1001,
} as const;

/** Android notification channel — must match FCM default channel in native manifest. */
export const NOTIFICATION_CHANNEL = {
  ID: 'game_alerts',
  NAME: 'Game alerts',
  /** IMPORTANCE_HIGH — wakes screen and shows heads-up notification. */
  IMPORTANCE: 4 as const,
  /** VISIBILITY_PUBLIC — show full content on lock screen. */
  VISIBILITY: 1 as const,
  DESCRIPTION: 'Leaderboard updates and daily reward reminders',
} as const;

export const NOTIFICATION_ROUTES = {
  HOME: 'Home',
  LEADERBOARD: 'Leaderboard',
  DAILY_REWARD: 'DailyReward',
} as const;

export type NotificationRoute = (typeof NOTIFICATION_ROUTES)[keyof typeof NOTIFICATION_ROUTES];

/** FCM push types sent by game-api — local-only notifications use `route` only. */
export const NOTIFICATION_TYPES = {
  RANK_PUSH: 'rank_push',
  TOP_100_EXITED: 'top_100_exited',
  TOP_100_ENTERED: 'top_100_entered',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const DAILY_REWARD_REMINDER_HOUR = 7;
export const DAILY_REWARD_REMINDER_MINUTE = 0;

export type DeviceLocale = 'EN' | 'VI';
export type DevicePlatform = 'IOS' | 'ANDROID';

export interface NotificationState {
  syncAttempts: number;
  lastAttemptAt?: string;
  lastErrorCode?: string;
  nextAttemptAt?: string;
  unregisterPending: boolean;
  pendingToken: string | null;
  lastSyncedToken: string | null;
  platform: DevicePlatform | null;
  pendingLocale: DeviceLocale | null;
  lastSyncedLocale: DeviceLocale | null;
  pendingNotificationsEnabled: boolean | null;
}

export function createDefaultNotificationState(): NotificationState {
  return {
    platform: null,
    syncAttempts: 0,
    pendingToken: null,
    pendingLocale: null,
    lastSyncedToken: null,
    lastSyncedLocale: null,
    unregisterPending: false,
    pendingNotificationsEnabled: null,
  };
}

export function normalizeNotificationState(value: unknown): NotificationState {
  if (!value || typeof value !== 'object') {
    return createDefaultNotificationState();
  }

  const raw = value as Partial<NotificationState>;

  return {
    unregisterPending: Boolean(raw.unregisterPending),
    syncAttempts: typeof raw.syncAttempts === 'number' ? raw.syncAttempts : 0,
    pendingToken: typeof raw.pendingToken === 'string' ? raw.pendingToken : null,
    lastSyncedToken: typeof raw.lastSyncedToken === 'string' ? raw.lastSyncedToken : null,
    platform: raw.platform === 'IOS' || raw.platform === 'ANDROID' ? raw.platform : null,
    lastAttemptAt: typeof raw.lastAttemptAt === 'string' ? raw.lastAttemptAt : undefined,
    lastErrorCode: typeof raw.lastErrorCode === 'string' ? raw.lastErrorCode : undefined,
    nextAttemptAt: typeof raw.nextAttemptAt === 'string' ? raw.nextAttemptAt : undefined,
    pendingLocale:
      raw.pendingLocale === 'EN' || raw.pendingLocale === 'VI' ? raw.pendingLocale : null,
    lastSyncedLocale:
      raw.lastSyncedLocale === 'EN' || raw.lastSyncedLocale === 'VI' ? raw.lastSyncedLocale : null,
    pendingNotificationsEnabled:
      typeof raw.pendingNotificationsEnabled === 'boolean' ? raw.pendingNotificationsEnabled : null,
  };
}

export function deviceSyncNeeded(state: NotificationState): boolean {
  if (state.unregisterPending) {
    return true;
  }

  if (!state.pendingToken || !state.pendingLocale || !state.platform) {
    return false;
  }

  return (
    state.lastSyncedToken !== state.pendingToken || state.lastSyncedLocale !== state.pendingLocale
  );
}

export interface PushNotificationPayload {
  type?: NotificationType;
  route?: NotificationRoute;
}

export interface NavigationRequest {
  returnTo?: string;
  scene: NotificationRoute;
  returnData?: Record<string, unknown>;
}

export function mapLocaleToDeviceLocale(language: string): DeviceLocale {
  return language.toLowerCase().startsWith('vi') ? 'VI' : 'EN';
}

export function getNextDailyRewardReminderAt(now = new Date()): Date {
  const scheduled = new Date(now);
  scheduled.setDate(scheduled.getDate() + 1);
  scheduled.setHours(DAILY_REWARD_REMINDER_HOUR, DAILY_REWARD_REMINDER_MINUTE, 0, 0);
  return scheduled;
}

export function resolveNotificationRoute(
  type?: NotificationType,
  route?: string
): NotificationRoute {
  if (route === NOTIFICATION_ROUTES.HOME) return NOTIFICATION_ROUTES.HOME;
  if (route === NOTIFICATION_ROUTES.LEADERBOARD) return NOTIFICATION_ROUTES.LEADERBOARD;
  if (route === NOTIFICATION_ROUTES.DAILY_REWARD) return NOTIFICATION_ROUTES.DAILY_REWARD;

  switch (type) {
    case NOTIFICATION_TYPES.TOP_100_ENTERED:
    case NOTIFICATION_TYPES.TOP_100_EXITED:
    case NOTIFICATION_TYPES.RANK_PUSH:
      return NOTIFICATION_ROUTES.LEADERBOARD;

    default:
      return NOTIFICATION_ROUTES.HOME;
  }
}
