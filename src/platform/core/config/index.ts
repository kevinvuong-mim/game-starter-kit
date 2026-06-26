import { Capacitor } from '@capacitor/core';

export type Environment = 'dev' | 'staging' | 'production';

export interface FirebaseConfig {
  appId: string;
  apiKey: string;
  projectId: string;
  authDomain: string;
  measurementId: string;
}

export interface RuntimeConfig {
  ads: AdsConfig;
  apiUrl: string;
  debug: boolean;
  gameId: string;
  adsEnabled: boolean;
  iapEnabled: boolean;
  firebase: FirebaseConfig;
  analyticsEnabled: boolean;
}

export interface AdsConfig {
  appId: string;
  testing: boolean;
  adUnits: {
    banner: string;
    appOpen: string;
    rewarded: string;
    interstitial: string;
  };
  provider: 'mock' | 'admob';
}

const ENV_CONFIGS: Record<Environment, Partial<RuntimeConfig>> = {
  dev: {
    debug: true,
    adsEnabled: false,
    analyticsEnabled: false,
    // Game Leaderboard API (NestJS) — base URL includes `/api` global prefix.
    apiUrl: 'http://localhost:3000/api',
  },
  staging: {
    debug: true,
    adsEnabled: true,
    analyticsEnabled: true,
    apiUrl: 'https://staging-api.studio.games/api',
  },
  production: {
    debug: false,
    adsEnabled: true,
    analyticsEnabled: true,
    apiUrl: 'https://api.studio.games/api',
  },
};

function resolveEnvironment(): Environment {
  const env = import.meta.env.VITE_APP_ENV as Environment | undefined;
  if (env && env in ENV_CONFIGS) return env;
  return import.meta.env.PROD ? 'production' : 'dev';
}

function resolveFirebaseConfig(): FirebaseConfig {
  return {
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
  };
}

function resolveAdMobAppId(): string {
  return pickPlatformEnv(
    import.meta.env.VITE_ADMOB_ANDROID_APP_ID,
    import.meta.env.VITE_ADMOB_IOS_APP_ID,
  );
}

/** Returns the iOS value on iOS, Android value on Android, else first non-empty (web/dev). */
function pickPlatformEnv(androidValue?: string, iosValue?: string): string {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return iosValue ?? '';
  if (platform === 'android') return androidValue ?? '';
  return androidValue || iosValue || '';
}

function resolveAdsConfig(): AdsConfig {
  return {
    appId: resolveAdMobAppId(),
    testing: import.meta.env.VITE_ADMOB_TESTING === 'true',
    adUnits: {
      banner: pickPlatformEnv(
        import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID,
        import.meta.env.VITE_ADMOB_IOS_BANNER_ID,
      ),
      appOpen: pickPlatformEnv(
        import.meta.env.VITE_ADMOB_ANDROID_APP_OPEN_ID,
        import.meta.env.VITE_ADMOB_IOS_APP_OPEN_ID,
      ),
      rewarded: pickPlatformEnv(
        import.meta.env.VITE_ADMOB_ANDROID_REWARDED_ID,
        import.meta.env.VITE_ADMOB_IOS_REWARDED_ID,
      ),
      interstitial: pickPlatformEnv(
        import.meta.env.VITE_ADMOB_ANDROID_INTERSTITIAL_ID,
        import.meta.env.VITE_ADMOB_IOS_INTERSTITIAL_ID,
      ),
    },
    provider: (import.meta.env.VITE_ADS_PROVIDER as AdsConfig['provider']) ?? 'mock',
  };
}

export function createConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
  const env = resolveEnvironment();
  const base = ENV_CONFIGS[env];

  return {
    ads: resolveAdsConfig(),
    apiUrl: base.apiUrl ?? '',
    debug: base.debug ?? false,
    gameId: 'game-starter-kit',
    firebase: resolveFirebaseConfig(),
    adsEnabled: base.adsEnabled ?? false,
    analyticsEnabled: base.analyticsEnabled ?? false,
    iapEnabled: import.meta.env.VITE_IAP_ENABLED === 'true',
    ...overrides,
  };
}

let _config: RuntimeConfig | null = null;

export function getConfig(): RuntimeConfig {
  if (!_config) {
    _config = createConfig();
  }
  return _config;
}

export function setConfig(config: RuntimeConfig): void {
  _config = config;
}

export function getEnvironment(): Environment {
  return resolveEnvironment();
}
