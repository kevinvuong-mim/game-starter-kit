import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  appName: 'Game Starter Kit',
  plugins: {
    SplashScreen: {
      showSpinner: false,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a2e',
    },
  },
  appId: 'com.studio.gamestarterkit',
};

export default config;
