import Dexie, { Table } from 'dexie';
import { Product, Transaction, Employee, AuditLog, DailyCashRegister, Settings } from '../../types';

export class OfflineDB extends Dexie {
  products!: Table<Product, string>;
  employees!: Table<Employee, string>;
  transactions!: Table<Transaction, number>; 
  daily_registers!: Table<DailyCashRegister, number>;
  audit_logs!: Table<AuditLog, number>;
  settings!: Table<Settings, string>;
  cached_data!: Table<any, string>;

  constructor() {
    super('ModernPOS_OfflineDB');
    
    // Version 6: Update employees for locking fields
    (this as any).version(6).stores({
      products: 'id, sku, category, name, stock_quantity', 
      employees: 'id, name, role, pin_hash, is_locked',
      transactions: '++id, transaction_number, created_at, payment_status, employee_id, synced', 
      daily_registers: '++id, employee_id, status, start_time',
      audit_logs: '++id, employee_id, action, timestamp',
      settings: 'id',
      cached_data: 'id, type'
    });
  }
}

export const offlineDB = new OfflineDB();