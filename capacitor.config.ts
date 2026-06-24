import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  appName: 'Game Starter Kit',
  plugins: {
    StatusBar: {
      overlaysWebView: true,
    },
    SplashScreen: {
      showSpinner: false,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
    },
  },
  appId: 'com.studio.gamestarterkit',
};

export default config;
