import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  appName: 'Game Starter Kit',
  plugins: {
    // Route fetch/XHR through the native HTTP layer so requests to a plain-HTTP
    // dev backend are not blocked by the WebView's mixed-content / CORS policy.
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      overlaysWebView: true,
    },
    SplashScreen: {
      showSpinner: false,
      launchAutoHide: false,
      backgroundColor: '#6b97b2',
    },
  },
  appId: 'com.studio.gamestarterkit',
};

export default config;
