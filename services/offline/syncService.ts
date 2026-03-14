// services/offline/syncService.ts
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore'; // Changed imports
import { db as firestore } from '../firebase/config';
import { offlineDB } from './db';
import { Product, Transaction, Employee } from '../../types';
import { settingsService } from '../settings/settingsService';
import { pinAuth } from '../auth/pinAuth';
import { ENV } from '../../config/env';
import { useSyncStore } from '../../stores/useSyncStore';

const SYNC_INTERVAL = 5 * 60 * 1000;

function toISOString(value: any): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

const IS_MOCK_ENV = ENV.FIREBASE.PROJECT_ID === 'mock-project';

function cleanUndefinedValues(obj: any): any {
  if (Array.isArray(obj)) return obj.map(cleanUndefinedValues);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) cleaned[key] = cleanUndefinedValues(value);
    }
    return cleaned;
  }
  return obj;
}

export const syncService = {
  async syncProductsFromFirebase() {
    if (IS_MOCK_ENV) {
      console.log('Mock environment: Skipping product sync from Firebase');
      return;
    }
    try {
      const merchantId = localStorage.getItem('bound_merchant_id');
      if (!merchantId) return;

      useSyncStore.getState().setSyncing(true);
      const q = query(collection(firestore, 'products'), where('merchant_id', '==', merchantId));
      const snapshot = await getDocs(q);
      const products: Product[] = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Product));

      // Always clear and reload from Firebase (no fallback to seed data)
      await offlineDB.products.clear();

      if (products.length > 0) {
        await offlineDB.products.bulkPut(products);
      }
      // If no products in Firebase, database remains empty - user must add via admin UI

      await offlineDB.cached_data.put({ id: 'last_product_sync', timestamp: Date.now() });
      useSyncStore.getState().setLastSyncTime(Date.now());
    } catch (error) {
      console.error('Error syncing products:', error);
      // Don't fallback to seed data - let user know data needs to be added via admin
      console.warn('No products available. Please add products via the admin UI.');
    } finally {
      useSyncStore.getState().setSyncing(false);
    }
  },

  async syncEmployeesFromFirebase() {
    if (IS_MOCK_ENV) { await this.seedDefaultAdmin(); return; }
    try {
      const merchantId = localStorage.getItem('bound_merchant_id');
      if (!merchantId) return;

      useSyncStore.getState().setSyncing(true);
      const q = query(collection(firestore, 'employees'), where('merchant_id', '==', merchantId));
      const snapshot = await getDocs(q);
      const employees: Employee[] = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Employee));
      if (employees.length > 0) {
        await offlineDB.employees.bulkPut(employees);
      } else {
        await this.seedDefaultAdmin();
      }
      await offlineDB.cached_data.put({ id: 'last_employee_sync', timestamp: Date.now() });
      useSyncStore.getState().setLastSyncTime(Date.now());
    } catch (error) {
      console.error('Error syncing employees:', error);
      await this.seedDefaultAdmin();
    } finally {
      useSyncStore.getState().setSyncing(false);
    }
  },

  async seedDefaultAdmin() {
    const count = await offlineDB.employees.count();
    if (count > 0) return;
    const pinHash = await pinAuth.hashPIN('1234');
    const defaultAdmin: Employee = {
      id: 'default_admin', name: 'Admin User', pin_hash: pinHash, role: 'admin', active: true, access_level: 10
    };
    await offlineDB.employees.add(defaultAdmin);
  },

  async saveTransaction(transaction: Transaction) {
    const merchantId = localStorage.getItem('bound_merchant_id');
    const id = await offlineDB.transactions.add({
      ...transaction,
      merchant_id: merchantId || undefined,
      synced: false,
      created_at: toISOString(transaction.created_at)
    });

    const pendingCount = await offlineDB.transactions.filter(t => !t.synced).count();
    useSyncStore.getState().setPendingCount(pendingCount);

    if (navigator.onLine && !IS_MOCK_ENV) {
      this.syncPendingTransactions();
    }
    return id;
  },

  async syncPendingTransactions() {
    if (!navigator.onLine || IS_MOCK_ENV) return;

    const pending = await offlineDB.transactions.filter(t => !t.synced).toArray();
    useSyncStore.getState().setPendingCount(pending.length);

    if (pending.length === 0) return;

    useSyncStore.getState().setSyncing(true);

    for (const transaction of pending) {
      try {
        const { id, ...data } = transaction;

        // Removed logic that overwrites `created_at`, effectively triggering an exception with Firebase rules
        const firestoreData = cleanUndefinedValues({
          ...(data as any),
          synced: true
        });

        // FIX: Always use the strict unique transaction number as ID so offline updates override effectively
        await setDoc(doc(firestore, 'transactions', transaction.transaction_number), firestoreData, { merge: true });
        await offlineDB.transactions.update(id as number, { synced: true });

      } catch (error) {
        console.error(`Failed to sync transaction ${transaction.transaction_number}`, error);
      }
    }

    const remaining = await offlineDB.transactions.filter(t => !t.synced).count();
    useSyncStore.getState().setPendingCount(remaining);
    useSyncStore.getState().setSyncing(false);
  },

  async init() {
    await this.seedDefaultAdmin();
    // Products are now loaded ONLY from Firebase via syncProductsFromFirebase()

    const pendingCount = await offlineDB.transactions.filter(t => !t.synced).count();
    useSyncStore.getState().setPendingCount(pendingCount);

    if (navigator.onLine && !IS_MOCK_ENV) {
      this.syncProductsFromFirebase();
      this.syncEmployeesFromFirebase();
      settingsService.syncSettingsFromFirebase();
      this.syncPendingTransactions();
    }

    setInterval(() => {
      if (navigator.onLine && !IS_MOCK_ENV) {
        this.syncProductsFromFirebase();
        this.syncEmployeesFromFirebase();
      }
    }, SYNC_INTERVAL);

    window.addEventListener('online', () => {
      if (!IS_MOCK_ENV) {
        this.syncPendingTransactions();
        this.syncProductsFromFirebase();
        this.syncEmployeesFromFirebase();
        settingsService.syncSettingsFromFirebase();
      }
    });
  }
};