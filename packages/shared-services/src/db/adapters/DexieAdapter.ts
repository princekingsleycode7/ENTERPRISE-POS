import Dexie, { Table } from "dexie";
import { IDatabase } from "../DatabaseAdapter";
import {
  Product,
  Transaction,
  Employee,
  AuditLog,
  DailyCashRegister,
  Settings,
} from "../../types";

function toISOString(value: any): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  return new Date().toISOString();
}

class DexieImplementation extends Dexie implements IDatabase {
  products!: Table<Product, string>;
  employees!: Table<Employee, string>;
  transactions!: Table<Transaction, number>;
  daily_registers!: Table<DailyCashRegister, number>;
  audit_logs!: Table<AuditLog, number>;
  settings!: Table<Settings, string>;
  cached_data!: Table<any, string>;

  constructor() {
    super("ModernPOS_OfflineDB");

    (this as any).version(7).stores({
      products: "id, sku, category, name, stock_quantity",
      employees: "id, name, role, pin_hash, is_locked",
      transactions:
        "++id, transaction_number, created_at, payment_status, employee_id, synced",
      daily_registers: "++id, employee_id, status, start_time",
      audit_logs: "++id, employee_id, action, timestamp",
      settings: "id",
      cached_data: "id, type",
    }).upgrade(async (tx: any) => {
      const transactions = await tx
        .table("transactions")
        .toCollection()
        .toArray();
      for (const t of transactions) {
        if (t.created_at && typeof t.created_at !== "string") {
          await tx.table("transactions").update(t.id, {
            created_at: toISOString(t.created_at),
          });
        }
      }
    });
  }

  async init(): Promise<void> {
    // Dexie doesn't need explicit init
  }

  // Product operations
  async getProducts(): Promise<Product[]> {
    return this.products.toArray();
  }

  async getProduct(id: string | number): Promise<Product | undefined> {
    return this.products.get(id as string);
  }

  async saveProduct(product: Product): Promise<string | number> {
    return this.products.put(product as any);
  }

  async saveProducts(products: Product[]): Promise<void> {
    return this.products.bulkPut(products as any);
  }

  async deleteProduct(id: string | number): Promise<void> {
    return this.products.delete(id as string);
  }

  async clearProducts(): Promise<void> {
    return this.products.clear();
  }

  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    return this.employees.toArray();
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async saveEmployee(employee: Employee): Promise<string> {
    const id = await this.employees.put(employee);
    return String(id);
  }

  async saveEmployees(employees: Employee[]): Promise<void> {
    return this.employees.bulkPut(employees);
  }

  async deleteEmployee(id: string): Promise<void> {
    return this.employees.delete(id);
  }

  // Transaction operations
  async getTransactions(limit?: number): Promise<Transaction[]> {
    let query = this.transactions.orderBy('created_at').reverse();
    if (limit) {
      query = query.limit(limit);
    }
    return query.toArray();
  }

  async getTransaction(id: string | number): Promise<Transaction | undefined> {
    return this.transactions.get(id as any);
  }

  async getUnSyncedTransactions(): Promise<Transaction[]> {
    return this.transactions.where('synced').equals(false).toArray();
  }

  async saveTransaction(transaction: Transaction): Promise<string | number> {
    return this.transactions.put(transaction as any);
  }

  async saveTransactions(transactions: Transaction[]): Promise<void> {
    return this.transactions.bulkPut(transactions as any);
  }

  async markTransactionSynced(id: string | number): Promise<void> {
    return this.transactions.update(id as any, { synced: true });
  }

  // Daily Register operations
  async getDailyRegisters(limit?: number): Promise<DailyCashRegister[]> {
    let query = this.daily_registers.orderBy('start_time').reverse();
    if (limit) {
      query = query.limit(limit);
    }
    return query.toArray();
  }

  async getDailyRegister(id: string | number): Promise<DailyCashRegister | undefined> {
    return this.daily_registers.get(id as any);
  }

  async saveDailyRegister(register: DailyCashRegister): Promise<string | number> {
    return this.daily_registers.put(register as any);
  }

  async saveDailyRegisters(registers: DailyCashRegister[]): Promise<void> {
    return this.daily_registers.bulkPut(registers as any);
  }

  // Audit Log operations
  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    let query = this.audit_logs.orderBy('timestamp').reverse();
    if (limit) {
      query = query.limit(limit);
    }
    return query.toArray();
  }

  async saveAuditLog(log: AuditLog): Promise<string | number> {
    return this.audit_logs.put(log as any);
  }

  async saveAuditLogs(logs: AuditLog[]): Promise<void> {
    return this.audit_logs.bulkPut(logs as any);
  }

  // Settings operations
  async getSettings(): Promise<Settings | undefined> {
    return this.settings.get('global');
  }

  async saveSettings(settings: Settings): Promise<void> {
    const settingsWithId = { ...settings, id: 'global' };
    return this.settings.put(settingsWithId as any);
  }

  // Cache operations
  async getCachedData(id: string): Promise<any> {
    return this.cached_data.get(id);
  }

  async setCachedData(id: string, data: any): Promise<void> {
    return this.cached_data.put({ id, ...data });
  }

  // Utility
  async clear(): Promise<void> {
    return this.delete();
  }
}

export const dexieAdapter = new DexieImplementation();
