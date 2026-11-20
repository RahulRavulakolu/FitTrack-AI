import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.fittrack.ai',
  appName: 'FitTrack AI',
  webDir: 'dist/client',
  backgroundColor: '#111512',
  server: { androidScheme: 'https' },
  plugins: {
    CapacitorHttp: { enabled: true },
    SplashScreen: { launchShowDuration: 1200, backgroundColor: '#111512', showSpinner: false },
    StatusBar: { style: 'DARK', backgroundColor: '#111512', overlaysWebView: false },
  },
};
export default config;
