// In a real Vite app, these would be accessed via import.meta.env
// For this environment, we are mocking the structure to show usage.

export const ENV = {
  FIREBASE: {
    API_KEY: process.env.REACT_APP_FIREBASE_API_KEY || 'mock-api-key',
    AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'mock-project.firebaseapp.com',
    PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'mock-project',
    STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'mock-project.appspot.com',
    MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '123456789',
    APP_ID: process.env.REACT_APP_FIREBASE_APP_ID || '1:123456789:web:abcdef',
  },
  KORAPAY: {
    PUBLIC_KEY: process.env.REACT_APP_KORAPAY_PUBLIC_KEY || 'pk_test_...',
  },
  APP: {
    ENV: process.env.NODE_ENV || 'development',
    NAME: 'Modern POS',
  }
};