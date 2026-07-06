export const NOTIFICATION_STORAGE_KEY = 'notification-state-v1';

export const NOTIFICATION_IDS = {
  DAILY_REWARD: 1001,
} as const;

export const NOTIFICATION_ROUTES = {
  HOME: 'Home',
  LEADERBOARD: 'Leaderboard',
  DAILY_REWARD: 'DailyReward',
} as const;

export type NotificationRoute = (typeof NOTIFICATION_ROUTES)[keyof typeof NOTIFICATION_ROUTES];

export const NOTIFICATION_TYPES = {
  DAILY_REWARD: 'daily_reward',
  SATURDAY_RANK: 'saturday_rank',
  TOP_100_EXITED: 'top_100_exited',
  TOP_100_ENTERED: 'top_100_entered',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const DAILY_REWARD_REMINDER_HOUR = 7;
export const DAILY_REWARD_REMINDER_MINUTE = 0;

export type DeviceLocale = 'EN' | 'VI';
export type DevicePlatform = 'IOS' | 'ANDROID';

export interface NotificationState {
  permissionGranted: boolean;
  lastRegisteredToken: string | null;
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

export function createDefaultNotificationState(): NotificationState {
  return {
    permissionGranted: false,
    lastRegisteredToken: null,
  };
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
    case NOTIFICATION_TYPES.DAILY_REWARD:
      return NOTIFICATION_ROUTES.DAILY_REWARD;

    case NOTIFICATION_TYPES.TOP_100_ENTERED:
    case NOTIFICATION_TYPES.TOP_100_EXITED:
    case NOTIFICATION_TYPES.SATURDAY_RANK:
      return NOTIFICATION_ROUTES.LEADERBOARD;

    default:
      return NOTIFICATION_ROUTES.HOME;
  }
}
