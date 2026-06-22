/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: 'dev' | 'staging' | 'production';
  readonly VITE_API_URL: string;
  readonly VITE_ANALYTICS_ENABLED: string;
  readonly VITE_ADS_ENABLED: string;
  readonly VITE_IAP_ENABLED: string;
  readonly VITE_GAME_ID: string;
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
