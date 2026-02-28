// Shared environment configuration to be used by web and mobile apps
// In web: use import.meta.env (Vite)
// In mobile: use process.env or custom env system

export const ENV = {
  FIREBASE: {
    API_KEY: import.meta?.env?.VITE_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    AUTH_DOMAIN: import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    PROJECT_ID: import.meta?.env?.VITE_FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    STORAGE_BUCKET: import.meta?.env?.VITE_FIREBASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    MESSAGING_SENDER_ID: import.meta?.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    APP_ID: import.meta?.env?.VITE_FIREBASE_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  },
  KORAPAY: {
    PUBLIC_KEY: import.meta?.env?.VITE_KORAPAY_PUBLIC_KEY || process.env.EXPO_PUBLIC_KORAPAY_PUBLIC_KEY || '',
  },
  MONIEPOINT: {
    DEFAULT_TERMINAL_SERIAL: import.meta?.env?.VITE_MONIEPOINT_TERMINAL_SERIAL || process.env.EXPO_PUBLIC_MONIEPOINT_TERMINAL_SERIAL || '',
  },
  APP: {
    ENV: import.meta?.env?.MODE || process.env.NODE_ENV || 'development',
    NAME: 'Modern POS',
  }
};
