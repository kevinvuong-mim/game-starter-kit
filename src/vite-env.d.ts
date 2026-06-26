/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IAP_ENABLED: string;
  readonly VITE_ADMOB_TESTING: string;
  readonly VITE_ADMOB_BANNER_ID: string;
  readonly VITE_ADMOB_IOS_APP_ID: string;
  readonly VITE_ADMOB_APP_OPEN_ID: string;
  readonly VITE_ADMOB_REWARDED_ID: string;
  readonly VITE_ADMOB_ANDROID_APP_ID: string;
  readonly VITE_ADMOB_INTERSTITIAL_ID: string;
  readonly VITE_ADS_PROVIDER: 'mock' | 'admob';
  readonly VITE_APP_ENV: 'dev' | 'staging' | 'production';

  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
