// This file is deprecated in favor of services/offline/db.ts
// Re-exporting for backward compatibility during migration
import { offlineDB } from './offline/db';

export const db = offlineDB;
export const seedDatabase = async () => {
    // No-op: Seeding is now handled by syncService from Firebase
    console.warn("seedDatabase is deprecated. Data should be synced from Firebase.");
};