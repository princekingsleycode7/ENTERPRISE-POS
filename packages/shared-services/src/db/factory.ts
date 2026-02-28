import { IDatabase } from './DatabaseAdapter';
import { DexieAdapter } from './adapters/DexieAdapter';
import { SQLiteAdapter } from './adapters/SQLiteAdapter';

/**
 * Factory function to get the appropriate database adapter
 * Uses platform detection to choose between Dexie (web) and SQLite (mobile)
 */
export function getDatabaseAdapter(): IDatabase {
  // Detect if we're in a React Native/Expo environment
  const isNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  
  if (isNative) {
    return new SQLiteAdapter();
  } else {
    return new DexieAdapter();
  }
}

// Singleton instance
let dbInstance: IDatabase | null = null;

export async function initializeDatabase(): Promise<IDatabase> {
  if (!dbInstance) {
    dbInstance = getDatabaseAdapter();
    await dbInstance.init();
  }
  return dbInstance;
}

export function getDatabase(): IDatabase {
  if (!dbInstance) {
    dbInstance = getDatabaseAdapter();
  }
  return dbInstance;
}
