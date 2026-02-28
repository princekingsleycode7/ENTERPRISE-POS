// Re-export all shared services for web and mobile apps

// Types
export * from './types';

// Config
export { ENV } from './config';

// Stores (Zustand)
export { useAuthStore } from './stores/useAuthStore';
export { useCartStore } from './stores/useCartStore';
export { useNotificationStore } from './stores/useNotificationStore';
export { useSyncStore } from './stores/useSyncStore';

// Database layer
export type { IDatabase } from './db/DatabaseAdapter';
export { DexieAdapter } from './db/adapters/DexieAdapter';
export { SQLiteAdapter } from './db/adapters/SQLiteAdapter';
export { getDatabase, initializeDatabase } from './db';

// Services
export { pinAuth, logAuditAction, auditService, addDocument, updateDocument, deleteDocument, getDocument, queryDocuments } from './services';
