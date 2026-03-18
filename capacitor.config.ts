import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wanderlogbl.app',
  appName: 'WortpBL',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.7:3000',
    cleartext: true,
    androidScheme: 'http' // ✅ TAMBAHKAN INI
  }
};

export default config;