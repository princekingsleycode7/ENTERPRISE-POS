import Dexie, { Table } from "dexie";
import {
  Product,
  Transaction,
  Employee,
  AuditLog,
  DailyCashRegister,
  Settings,
} from "../../types";

// Add this near the top of services/offline/db.ts, before the class
function toISOString(value: any): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString(); // Firestore Timestamp
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  return new Date().toISOString();
}

export class OfflineDB extends Dexie {
  products!: Table<Product, string>;
  employees!: Table<Employee, string>;
  transactions!: Table<Transaction, number>;
  daily_registers!: Table<DailyCashRegister, number>;
  audit_logs!: Table<AuditLog, number>;
  settings!: Table<Settings, string>;
  cached_data!: Table<any, string>;

  constructor() {
    super("ModernPOS_OfflineDB");

    // Version 6: Update employees for locking fields
    (this as any).version(6).stores({
      products: "id, sku, category, name, stock_quantity",
      employees: "id, name, role, pin_hash, is_locked",
      transactions:
        "++id, transaction_number, created_at, payment_status, employee_id, synced",
      daily_registers: "++id, employee_id, status, start_time",
      audit_logs: "++id, employee_id, action, timestamp",
      settings: "id",
      cached_data: "id, type",
    });

    // In OfflineDB constructor, add a new version:
    (this as any)
      .version(7)
      .stores({
        products: "id, sku, category, name, stock_quantity",
        employees: "id, name, role, pin_hash, is_locked",
        transactions:
          "++id, transaction_number, created_at, payment_status, employee_id, synced",
        daily_registers: "++id, employee_id, status, start_time",
        audit_logs: "++id, employee_id, action, timestamp",
        settings: "id",
        cached_data: "id, type",
      })
      .upgrade(async (tx: any) => {
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
}

export const offlineDB = new OfflineDB();
