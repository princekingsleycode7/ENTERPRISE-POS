// services/transactions/transactionService.ts
import { offlineDB } from '../offline/db';
import { Transaction, DailyCashRegister, User } from '../../types';
import { updateDocument } from '../firebase/firestore';
import { logAuditAction } from '../firebase/audit';
import { syncService } from '../offline/syncService';

function toISOString(value: any): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString(); 
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  return new Date().toISOString();
}

export const transactionService = {
  
  async createTransaction(transactionData: Transaction) {
    try {
      await syncService.saveTransaction(transactionData);
      return true;
    } catch (error) {
      console.error('Create Transaction Failed:', error);
      throw error;
    }
  },

  async getTransactions(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    employeeId?: string;
    searchTerm?: string;
  }) {
    let collection = offlineDB.transactions.orderBy('created_at').reverse();
    let results = await collection.toArray();

    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        results = results.filter(t => {
          const d = new Date(t.created_at);
          return d >= start && d <= end;
        });
      }
    }

    if (filters.status && filters.status !== 'all') {
      results = results.filter(t => t.payment_status === filters.status);
    }
    if (filters.employeeId && filters.employeeId !== 'all') {
      results = results.filter(t => t.employee_id === filters.employeeId);
    }
    if (filters.searchTerm) {
      const lower = filters.searchTerm.toLowerCase();
      results = results.filter(t => 
        t.transaction_number.toLowerCase().includes(lower) ||
        t.payment_reference?.toLowerCase().includes(lower)
      );
    }
    return results;
  },

  async voidTransaction(transactionId: number | string, reason: string, manager: User) {
    try {
      const tx = await offlineDB.transactions.get(transactionId as any);
      if (!tx) throw new Error("Transaction not found");
      if (tx.payment_status === 'void') throw new Error("Transaction already voided");

      const updates = {
        payment_status: 'void' as const,
        void_reason: reason,
        void_by: manager.id,
        void_at: new Date().toISOString(),
        synced: false
      };

      await offlineDB.transactions.update(transactionId as any, updates);

      // FIX: Force online void directly targeting the predictable transaction number logic
      if (navigator.onLine) {
        try {
          await updateDocument('transactions', tx.transaction_number, {
              payment_status: 'void',
              void_reason: reason,
              void_by: manager.id,
              void_at: updates.void_at,
              synced: true
          });
          await offlineDB.transactions.update(transactionId as any, { synced: true });
        } catch (e) {
          console.warn("Failed to update Firebase immediately, will sync later", e);
        }
      }

      await logAuditAction('VOID_TRANSACTION', `Transaction:${tx.transaction_number}`, {
        reason, amount: tx.total, manager_id: manager.id
      });

      return true;
    } catch (error) {
      console.error("Void Failed:", error);
      throw error;
    }
  },

  // --- Daily Register Logic ---
  async getCurrentRegister(employeeId: string): Promise<DailyCashRegister | undefined> {
    return await offlineDB.daily_registers
      .where('employee_id').equals(employeeId)
      .filter(r => r.status === 'open')
      .first();
  },

  async openRegister(employee: User, openingAmount: number) {
    const existing = await this.getCurrentRegister(employee.id);
    if (existing) throw new Error("Register already open");

    const register: DailyCashRegister = {
      employee_id: employee.id, employee_name: employee.name, opening_amount: openingAmount,
      start_time: new Date().toISOString(), status: 'open'
    };
    await offlineDB.daily_registers.add(register);
    await logAuditAction('OPEN_REGISTER', `Employee:${employee.name}`, { amount: openingAmount });
  },

  async getRegisterTotals(register: DailyCashRegister) {
    if (!register.start_time || typeof register.start_time !== 'string') {
       return { cashSales: 0, transactionsCount: 0, expectedCash: register.opening_amount };
    }

    const transactions = await offlineDB.transactions
      .where('created_at').aboveOrEqual(toISOString(register.start_time))
      .toArray();
    
    const cashSales = transactions
      .filter(t => t.employee_id === register.employee_id && t.payment_method === 'cash' && t.payment_status === 'paid')
      .reduce((sum, t) => sum + t.total, 0);

    return { cashSales, transactionsCount: transactions.length, expectedCash: register.opening_amount + cashSales };
  },

  async closeRegister(registerId: number, actualCash: number, notes?: string) {
    const register = await offlineDB.daily_registers.get(registerId);
    if (!register) throw new Error("Register not found");

    const { expectedCash } = await this.getRegisterTotals(register);
    const updates = {
      closing_amount: actualCash, expected_cash: expectedCash, actual_cash: actualCash,
      discrepancy: actualCash - expectedCash!, status: 'closed' as const, end_time: new Date().toISOString(), notes
    };

    await offlineDB.daily_registers.update(registerId, updates);
    await logAuditAction('CLOSE_REGISTER', `Register:${registerId}`, updates);
    return updates;
  }
};