/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Core — always set in .env
  readonly VITE_IAP_ENABLED: string;
  readonly VITE_ADMOB_TESTING: string;
  readonly VITE_ADMOB_IOS_APP_ID: string;
  readonly VITE_ADMOB_ANDROID_APP_ID: string;
  readonly VITE_ADS_PROVIDER: 'mock' | 'admob';
  readonly VITE_REVENUECAT_IOS_API_KEY?: string;
  readonly VITE_REVENUECAT_ANDROID_API_KEY?: string;
  readonly VITE_IAP_PROVIDER: 'mock' | 'revenuecat';
  readonly VITE_APP_ENV: 'dev' | 'staging' | 'production';

  // AdMob ad unit IDs — only set for production release builds
  readonly VITE_ADMOB_IOS_BANNER_ID?: string;
  readonly VITE_ADMOB_IOS_APP_OPEN_ID?: string;
  readonly VITE_ADMOB_IOS_REWARDED_ID?: string;
  readonly VITE_ADMOB_ANDROID_BANNER_ID?: string;
  readonly VITE_ADMOB_ANDROID_APP_OPEN_ID?: string;
  readonly VITE_ADMOB_ANDROID_REWARDED_ID?: string;
  readonly VITE_ADMOB_IOS_INTERSTITIAL_ID?: string;
  readonly VITE_ADMOB_ANDROID_INTERSTITIAL_ID?: string;

  // Firebase Analytics — only set for staging/production
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
