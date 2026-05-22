import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stashly.app',
  appName: 'Stashly',
  webDir: 'dist',
  ios: {
    path: '../Stashly.ios'
  },
  android: {
    path: '../Stashly.android'
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
