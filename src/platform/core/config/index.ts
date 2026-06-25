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
  adsEnabled: boolean;
  iapEnabled: boolean;
  firebase: FirebaseConfig;
  analyticsEnabled: boolean;
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

export function createConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
  const env = resolveEnvironment();
  const base = ENV_CONFIGS[env];

  return {
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
