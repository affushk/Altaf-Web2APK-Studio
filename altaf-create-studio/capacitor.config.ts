import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.altaf.createstudio',
  appName: 'Altaf Create Studio',
  webDir: 'dist',
  android: {
    backgroundColor: '#08090d',
    allowMixedContent: true
  }
};

export default config;
