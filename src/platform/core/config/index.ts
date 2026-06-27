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
  iap: IapConfig;
  apiUrl: string;
  debug: boolean;
  gameId: string;
  adsEnabled: boolean;
  iapEnabled: boolean;
  firebase: FirebaseConfig;
  analyticsEnabled: boolean;
}

export interface IapConfig {
  provider: 'mock' | 'revenuecat';
  revenueCat: {
    apiKey: string;
  };
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
    adsEnabled: true,
    analyticsEnabled: false,
    apiUrl: 'http://localhost:3000/api',
  },
  staging: {
    debug: true,
    adsEnabled: true,
    analyticsEnabled: true,
    apiUrl: 'http://staging-api.studio.games/api',
  },
  production: {
    debug: false,
    adsEnabled: true,
    analyticsEnabled: true,
    apiUrl: 'http://api.studio.games/api',
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
    import.meta.env.VITE_ADMOB_IOS_APP_ID
  );
}

/** Returns the iOS value on iOS, Android value on Android, else first non-empty (web/dev). */
function pickPlatformEnv(androidValue?: string, iosValue?: string): string {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return iosValue ?? '';
  if (platform === 'android') return androidValue ?? '';
  return androidValue || iosValue || '';
}

/**
 * Google's official sample ad unit IDs. They always return a test ad regardless
 * of account state, so dev builds can verify the ad flow without serving (and
 * accidentally clicking) real ads. See https://developers.google.com/admob/android/test-ads
 */
const GOOGLE_TEST_AD_UNITS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    appOpen: 'ca-app-pub-3940256099942544/9257395921',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    appOpen: 'ca-app-pub-3940256099942544/5575463023',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
} as const;

function resolveAdsConfig(): AdsConfig {
  const testing = import.meta.env.VITE_ADMOB_TESTING === 'true';

  // In testing mode use Google's sample ad units so ads reliably show in dev,
  // even before the real AdMob account/ad units are active.
  const adUnits = testing
    ? {
        banner: pickPlatformEnv(
          GOOGLE_TEST_AD_UNITS.android.banner,
          GOOGLE_TEST_AD_UNITS.ios.banner
        ),
        appOpen: pickPlatformEnv(
          GOOGLE_TEST_AD_UNITS.android.appOpen,
          GOOGLE_TEST_AD_UNITS.ios.appOpen
        ),
        rewarded: pickPlatformEnv(
          GOOGLE_TEST_AD_UNITS.android.rewarded,
          GOOGLE_TEST_AD_UNITS.ios.rewarded
        ),
        interstitial: pickPlatformEnv(
          GOOGLE_TEST_AD_UNITS.android.interstitial,
          GOOGLE_TEST_AD_UNITS.ios.interstitial
        ),
      }
    : {
        banner: pickPlatformEnv(
          import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID,
          import.meta.env.VITE_ADMOB_IOS_BANNER_ID
        ),
        appOpen: pickPlatformEnv(
          import.meta.env.VITE_ADMOB_ANDROID_APP_OPEN_ID,
          import.meta.env.VITE_ADMOB_IOS_APP_OPEN_ID
        ),
        rewarded: pickPlatformEnv(
          import.meta.env.VITE_ADMOB_ANDROID_REWARDED_ID,
          import.meta.env.VITE_ADMOB_IOS_REWARDED_ID
        ),
        interstitial: pickPlatformEnv(
          import.meta.env.VITE_ADMOB_ANDROID_INTERSTITIAL_ID,
          import.meta.env.VITE_ADMOB_IOS_INTERSTITIAL_ID
        ),
      };

  return {
    appId: resolveAdMobAppId(),
    testing,
    adUnits,
    provider: (import.meta.env.VITE_ADS_PROVIDER as AdsConfig['provider']) ?? 'mock',
  };
}

function resolveIapConfig(): IapConfig {
  const provider = (import.meta.env.VITE_IAP_PROVIDER as IapConfig['provider']) ?? 'mock';
  const apiKey = pickPlatformEnv(
    import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY,
    import.meta.env.VITE_REVENUECAT_IOS_API_KEY
  );

  return {
    provider,
    revenueCat: { apiKey },
  };
}

export function createConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
  const env = resolveEnvironment();
  const base = ENV_CONFIGS[env];

  return {
    ads: resolveAdsConfig(),
    iap: resolveIapConfig(),
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
