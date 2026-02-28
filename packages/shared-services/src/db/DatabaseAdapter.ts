import {
  Product,
  Transaction,
  Employee,
  AuditLog,
  DailyCashRegister,
  Settings,
} from '../types';

/**
 * Platform-agnostic database interface
 * Implementations: Dexie (web), SQLite (mobile)
 */
export interface IDatabase {
  // Product operations
  getProducts(): Promise<Product[]>;
  getProduct(id: string | number): Promise<Product | undefined>;
  saveProduct(product: Product): Promise<string | number>;
  saveProducts(products: Product[]): Promise<void>;
  deleteProduct(id: string | number): Promise<void>;
  clearProducts(): Promise<void>;

  // Employee operations
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  saveEmployee(employee: Employee): Promise<string>;
  saveEmployees(employees: Employee[]): Promise<void>;
  deleteEmployee(id: string): Promise<void>;

  // Transaction operations
  getTransactions(limit?: number): Promise<Transaction[]>;
  getTransaction(id: string | number): Promise<Transaction | undefined>;
  getUnSyncedTransactions(): Promise<Transaction[]>;
  saveTransaction(transaction: Transaction): Promise<string | number>;
  saveTransactions(transactions: Transaction[]): Promise<void>;
  markTransactionSynced(id: string | number): Promise<void>;

  // Daily Register operations
  getDailyRegisters(limit?: number): Promise<DailyCashRegister[]>;
  getDailyRegister(id: string | number): Promise<DailyCashRegister | undefined>;
  saveDailyRegister(register: DailyCashRegister): Promise<string | number>;
  saveDailyRegisters(registers: DailyCashRegister[]): Promise<void>;

  // Audit Log operations
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  saveAuditLog(log: AuditLog): Promise<string | number>;
  saveAuditLogs(logs: AuditLog[]): Promise<void>;

  // Settings operations
  getSettings(): Promise<Settings | undefined>;
  saveSettings(settings: Settings): Promise<void>;

  // Cache operations
  getCachedData(id: string): Promise<any>;
  setCachedData(id: string, data: any): Promise<void>;

  // Utility
  clear(): Promise<void>;
  init(): Promise<void>;
}
