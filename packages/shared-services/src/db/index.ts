import { IDatabase } from "./DatabaseAdapter";
import { dexieAdapter } from "./adapters/DexieAdapter";
import { sqliteAdapter } from "./adapters/SQLiteAdapter";

let dbInstance: IDatabase | null = null;

/**
 * Factory function to get the correct database adapter
 * - On web with 'dexie' platform: returns Dexie adapter
 * - On mobile with 'native' platform: returns SQLite adapter
 * - Defaults to Dexie for web
 */
export function getDatabase(platform?: 'web' | 'native'): IDatabase {
  if (dbInstance) return dbInstance;

  // Detect platform if not provided
  const detectedPlatform = platform || 
    (typeof window !== 'undefined' ? 'web' : 'native');

  if (detectedPlatform === 'web') {
    dbInstance = dexieAdapter;
  } else {
    dbInstance = sqliteAdapter;
  }

  return dbInstance;
}

export const db = getDatabase();

// Export adapters for direct access if needed
export { dexieAdapter } from './adapters/DexieAdapter';
export { sqliteAdapter } from './adapters/SQLiteAdapter';
export type { IDatabase } from './DatabaseAdapter';
