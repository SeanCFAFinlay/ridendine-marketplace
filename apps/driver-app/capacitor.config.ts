export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: {
    url?: string;
    cleartext?: boolean;
  };
  plugins?: Record<string, unknown>;
}

const config: CapacitorConfig = {
  appId: 'ca.ridendine.driver',
  appName: 'RideNDine Courier',
  webDir: '.next',
  server: {
    url: process.env.CAPACITOR_LIVE_URL || 'https://driver.ridendine.ca',
    cleartext: false,
  },
  plugins: {
    Geolocation: {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#EA5B26',
      showSpinner: false,
    },
  },
};

export default config;
