export type Environment = 'dev' | 'staging' | 'production';

export interface FirebaseConfig {
  appId: string;
  apiKey: string;
  projectId: string;
  authDomain: string;
  measurementId: string;
}

export interface RuntimeConfig {
  apiUrl: string;
  debug: boolean;
  gameId: string;
  version: string;
  adsEnabled: boolean;
  iapEnabled: boolean;
  firebase: FirebaseConfig;
  analyticsEnabled: boolean;
}

const EMPTY_FIREBASE: FirebaseConfig = {
  appId: '',
  apiKey: '',
  projectId: '',
  authDomain: '',
  measurementId: '',
};

const ENV_CONFIGS: Record<Environment, Partial<RuntimeConfig>> = {
  dev: {
    debug: true,
    adsEnabled: false,
    analyticsEnabled: false,
    firebase: EMPTY_FIREBASE,
    apiUrl: 'http://localhost:3000/api',
  },
  staging: {
    debug: true,
    adsEnabled: true,
    analyticsEnabled: true,
    firebase: EMPTY_FIREBASE,
    apiUrl: 'https://staging-api.studio.games/api',
  },
  production: {
    debug: false,
    adsEnabled: true,
    analyticsEnabled: true,
    firebase: EMPTY_FIREBASE,
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

export function createConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
  const env = resolveEnvironment();
  const base = ENV_CONFIGS[env];

  return {
    debug: base.debug ?? false,
    gameId: 'game-starter-kit',
    firebase: resolveFirebaseConfig(),
    version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
    iapEnabled: import.meta.env.VITE_IAP_ENABLED === 'true',
    apiUrl: import.meta.env.VITE_API_URL ?? base.apiUrl ?? '',
    adsEnabled: import.meta.env.VITE_ADS_ENABLED === 'true' || base.adsEnabled === true,
    analyticsEnabled:
      import.meta.env.VITE_ANALYTICS_ENABLED === 'true' || base.analyticsEnabled === true,
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
