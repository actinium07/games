import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.orbitalquartet.app',
  appName: 'Orbital Quartet',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
