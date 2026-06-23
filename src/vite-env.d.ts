/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ADS_ENABLED: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_IAP_ENABLED: string;
  readonly VITE_ANALYTICS_ENABLED: string;
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
