export type Environment = 'dev' | 'staging' | 'production';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  measurementId: string;
}

export interface RuntimeConfig {
  apiUrl: string;
  adsEnabled: boolean;
  analyticsEnabled: boolean;
  iapEnabled: boolean;
  debug: boolean;
  gameId: string;
  version: string;
  firebase: FirebaseConfig;
}

const EMPTY_FIREBASE: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
  measurementId: '',
};

const ENV_CONFIGS: Record<Environment, Partial<RuntimeConfig>> = {
  dev: {
    apiUrl: 'http://localhost:3000/api',
    adsEnabled: false,
    analyticsEnabled: false,
    debug: true,
    firebase: EMPTY_FIREBASE,
  },
  staging: {
    apiUrl: 'https://staging-api.studio.games/api',
    adsEnabled: true,
    analyticsEnabled: true,
    debug: true,
    firebase: EMPTY_FIREBASE,
  },
  production: {
    apiUrl: 'https://api.studio.games/api',
    adsEnabled: true,
    analyticsEnabled: true,
    debug: false,
    firebase: EMPTY_FIREBASE,
  },
};

function resolveEnvironment(): Environment {
  const env = import.meta.env.VITE_APP_ENV as Environment | undefined;
  if (env && env in ENV_CONFIGS) return env;
  return import.meta.env.PROD ? 'production' : 'dev';
}

function resolveFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
  };
}

export function createConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
  const env = resolveEnvironment();
  const base = ENV_CONFIGS[env];

  return {
    apiUrl: import.meta.env.VITE_API_URL ?? base.apiUrl ?? '',
    adsEnabled: import.meta.env.VITE_ADS_ENABLED === 'true' || base.adsEnabled === true,
    analyticsEnabled:
      import.meta.env.VITE_ANALYTICS_ENABLED === 'true' || base.analyticsEnabled === true,
    iapEnabled: import.meta.env.VITE_IAP_ENABLED === 'true',
    debug: base.debug ?? false,
    gameId: 'game-starter-kit',
    version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
    firebase: resolveFirebaseConfig(),
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
