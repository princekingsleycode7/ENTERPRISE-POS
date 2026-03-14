// config/env.ts
// In a real Vite app, these would be accessed via import.meta.env

// config/env.ts
// In a real Vite app, these would be accessed via import.meta.env
// For this environment, we are mocking the structure to show usage.

export const ENV = {
  FIREBASE: {
    API_KEY: import.meta.env.VITE_FIREBASE_API_KEY as string,
    AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    APP_ID: import.meta.env.VITE_FIREBASE_APP_ID as string,
  },
  KORAPAY: {
    PUBLIC_KEY: import.meta.env.VITE_KORAPAY_PUBLIC_KEY as string,
    SECRET_KEY: import.meta.env.VITE_KORAPAY_SECRET_KEY as string
  },
  MONIEPOINT: {
    DEFAULT_TERMINAL_SERIAL: import.meta.env.VITE_MONIEPOINT_TERMINAL_SERIAL,
  },
  APP: {
    ENV: process.env.NODE_ENV || 'development',
    NAME: 'Modern POS',
  }
};



/**
 * MONIEPOINT
 * ──────────────────────────────────────────────────────────────────────────
 * IMPORTANT: client_id and client_secret are NEVER stored here.
 * They live exclusively in Firebase Functions config:
 *   firebase functions:config:set moniepoint.client_id="..." moniepoint.client_secret="..."
 *
 * The frontend only needs to know the default terminal serial, which can
 * also be overridden per-store in Firestore settings.
 */
