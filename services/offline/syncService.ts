import { collection, getDocs, addDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from '../firebase/config';
import { offlineDB } from './db';
import { Product, Transaction, Employee } from '../../types';
import { addDocument } from '../firebase/firestore';
import { pinAuth } from '../auth/pinAuth';
import { ENV } from '../../config/env';
import { useSyncStore } from '../../stores/useSyncStore';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes


// Helper function to add at the top of syncService.ts:
function toISOString(value: any): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  // Handle Firestore Timestamp
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

// Check for mock environment to prevent connection errors
const IS_MOCK_ENV = ENV.FIREBASE.PROJECT_ID === 'mock-project';

export const syncService = {
  // Sync Products: Firebase -> IndexedDB
  async syncProductsFromFirebase() {
    if (IS_MOCK_ENV) {
      await this.seedDefaultProducts();
      return;
    }

    try {
      useSyncStore.getState().setSyncing(true);
      console.log('Starting product sync...');
      const snapshot = await getDocs(collection(firestore, 'products'));
      const products: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      } as Product));

      if (products.length > 0) {
        await offlineDB.products.bulkPut(products);
        console.log(`Synced ${products.length} products to local DB`);
      } else {
        await this.seedDefaultProducts();
      }
      
      await offlineDB.cached_data.put({ id: 'last_product_sync', timestamp: Date.now() });
      useSyncStore.getState().setLastSyncTime(Date.now());
      
    } catch (error) {
      console.error('Error syncing products:', error);
      await this.seedDefaultProducts();
    } finally {
       useSyncStore.getState().setSyncing(false);
    }
  },

  async seedDefaultProducts() {
    const count = await offlineDB.products.count();
    if (count > 0) return;

    console.log("Seeding default products...");
    const products: Product[] = [
      { id: 'prod_1', name: 'Espresso', sku: 'COF001', price: 3.50, cost: 0.50, category: 'Coffee', stock_quantity: 100, reorder_level: 10 },
      { id: 'prod_2', name: 'Cappuccino', sku: 'COF002', price: 4.50, cost: 0.80, category: 'Coffee', stock_quantity: 80, reorder_level: 10 },
      { id: 'prod_3', name: 'Latte', sku: 'COF003', price: 4.75, cost: 0.90, category: 'Coffee', stock_quantity: 80, reorder_level: 10 },
      { id: 'prod_4', name: 'Croissant', sku: 'BAK001', price: 3.00, cost: 0.50, category: 'Bakery', stock_quantity: 20, reorder_level: 5 },
      { id: 'prod_5', name: 'Muffin', sku: 'BAK002', price: 3.25, cost: 0.60, category: 'Bakery', stock_quantity: 25, reorder_level: 5 },
      { id: 'prod_6', name: 'Iced Tea', sku: 'DRK001', price: 2.50, cost: 0.20, category: 'Drinks', stock_quantity: 50, reorder_level: 15 },
    ];
    await offlineDB.products.bulkPut(products);
  },

  // Sync Employees: Firebase -> IndexedDB
  async syncEmployeesFromFirebase() {
    if (IS_MOCK_ENV) {
      await this.seedDefaultAdmin();
      return;
    }

    try {
      useSyncStore.getState().setSyncing(true);
      console.log('Starting employee sync...');
      const snapshot = await getDocs(collection(firestore, 'employees'));
      const employees: Employee[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      } as Employee));

      if (employees.length > 0) {
        await offlineDB.employees.bulkPut(employees);
        console.log(`Synced ${employees.length} employees to local DB`);
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

    console.log("Seeding default admin...");
    const pinHash = await pinAuth.hashPIN('1234');
    const defaultAdmin: Employee = {
      id: 'default_admin',
      name: 'Admin User',
      pin_hash: pinHash,
      role: 'admin',
      active: true,
      access_level: 10
    };
    await offlineDB.employees.add(defaultAdmin);
    console.log("Default admin seeded. PIN: 1234");
  },

  // Save Transaction: IndexedDB (Local) -> Queue Sync
  async saveTransaction(transaction: Transaction) {
    // Add to 'transactions' table (previously pending_transactions)
    const id = await offlineDB.transactions.add({
      ...transaction,
      synced: false,
      // created_at: transaction.created_at || new Date().toISOString()
      created_at: toISOString(transaction.created_at) 
    });

    console.log(`Transaction ${transaction.transaction_number} saved locally with ID ${id}`);

    // Update pending count
    const pendingCount = await offlineDB.transactions.where({ synced: false }).count();
    useSyncStore.getState().setPendingCount(pendingCount);

    if (navigator.onLine && !IS_MOCK_ENV) {
      this.syncPendingTransactions();
    }
    return id;
  },

  // Sync Pending Transactions: IndexedDB -> Firebase
  async syncPendingTransactions() {
    if (!navigator.onLine || IS_MOCK_ENV) return;

    const pending = await offlineDB.transactions.where({ synced: false }).toArray();
    useSyncStore.getState().setPendingCount(pending.length);
    
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} pending transactions...`);
    useSyncStore.getState().setSyncing(true);

    for (const transaction of pending) {
      try {
        const { id, ...data } = transaction; 

        const firestoreData = {
          ...(data as any),
          created_at: serverTimestamp(),
          synced: true
        };

        await addDocument('transactions', firestoreData);
        
        await offlineDB.transactions.update(id as number, { synced: true });
        
        console.log(`Transaction ${transaction.transaction_number} synced successfully`);
        
      } catch (error) {
        console.error(`Failed to sync transaction ${transaction.transaction_number}`, error);
      }
    }
    
    // Update pending count after sync
    const remaining = await offlineDB.transactions.where({ synced: false }).count();
    useSyncStore.getState().setPendingCount(remaining);
    useSyncStore.getState().setSyncing(false);
  },

  // Initialize background sync
  async init() {
    await this.seedDefaultAdmin();
    await this.seedDefaultProducts();

    // Initial check for pending
    const pendingCount = await offlineDB.transactions.where({ synced: false }).count();
    useSyncStore.getState().setPendingCount(pendingCount);

    if (navigator.onLine && !IS_MOCK_ENV) {
      this.syncProductsFromFirebase();
      this.syncEmployeesFromFirebase();
      this.syncPendingTransactions();
    }

    setInterval(() => {
      if (navigator.onLine && !IS_MOCK_ENV) {
        this.syncProductsFromFirebase();
        this.syncEmployeesFromFirebase();
      }
    }, SYNC_INTERVAL);

    window.addEventListener('online', () => {
      console.log('Network restored. Triggering sync...');
      if (!IS_MOCK_ENV) {
        this.syncPendingTransactions();
        this.syncProductsFromFirebase();
        this.syncEmployeesFromFirebase();
      }
    });
  }
};