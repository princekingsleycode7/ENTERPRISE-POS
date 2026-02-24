import { offlineDB } from '../offline/db';
import { Transaction, DailyCashRegister, User } from '../../types';
import { updateDocument } from '../firebase/firestore';
import { logAuditAction } from '../firebase/audit';
import { syncService } from '../offline/syncService';

export const transactionService = {
  
  // --- Transaction Logic ---

  async createTransaction(transactionData: Transaction) {
    try {
      // 1. Save to local IndexedDB
      // The syncService will pick this up if synced=false and network is available
      await syncService.saveTransaction(transactionData);
      
      // 2. Update Daily Register if open (Track cash)
      if (transactionData.payment_method === 'cash') {
        const openRegister = await this.getCurrentRegister(transactionData.employee_id);
        if (openRegister) {
          // We don't necessarily update the register object on every sale in DB,
          // but we will calculate totals dynamically when closing.
          // However, you could incrementally update 'current_cash' here if desired.
        }
      }

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

    // Dexie filtering
    let results = await collection.toArray();

    if (filters.startDate && filters.endDate) {
      // Validate dates
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
      // 1. Get Transaction
      const tx = await offlineDB.transactions.get(transactionId as any);
      if (!tx) throw new Error("Transaction not found");

      if (tx.payment_status === 'void') throw new Error("Transaction already voided");

      const updates = {
        payment_status: 'void' as const,
        void_reason: reason,
        void_by: manager.id,
        void_at: new Date().toISOString(),
        synced: false // Mark false to trigger sync update
      };

      // 2. Update Local
      await offlineDB.transactions.update(transactionId as any, updates);

      // 3. Update Firebase (if online/id exists)
      // Note: If the transaction was created offline and has no Firebase ID (string), 
      // the sync service will eventually handle it. If it has a string ID, we update directly.
      if (typeof transactionId === 'string' && navigator.onLine) {
        await updateDocument('transactions', transactionId, {
            payment_status: 'void',
            void_reason: reason,
            void_by: manager.id,
            void_at: updates.void_at
        });
      }

      // 4. Log Audit
      await logAuditAction('VOID_TRANSACTION', `Transaction:${tx.transaction_number}`, {
        reason,
        amount: tx.total,
        manager_id: manager.id
      });

      return true;
    } catch (error) {
      console.error("Void Failed:", error);
      throw error;
    }
  },

  // --- Daily Register Logic ---

  async getCurrentRegister(employeeId: string): Promise<DailyCashRegister | undefined> {
    // Improved query using explicit index
    return await offlineDB.daily_registers
      .where('employee_id').equals(employeeId)
      .filter(r => r.status === 'open')
      .first();
  },

  async openRegister(employee: User, openingAmount: number) {
    const existing = await this.getCurrentRegister(employee.id);
    if (existing) throw new Error("Register already open");

    const register: DailyCashRegister = {
      employee_id: employee.id,
      employee_name: employee.name,
      opening_amount: openingAmount,
      start_time: new Date().toISOString(),
      status: 'open'
    };

    await offlineDB.daily_registers.add(register);
    await logAuditAction('OPEN_REGISTER', `Employee:${employee.name}`, { amount: openingAmount });
  },

  async getRegisterTotals(register: DailyCashRegister) {
    // Validate start_time is a valid string for IDB range query
    if (!register.start_time || typeof register.start_time !== 'string') {
       console.warn("Register missing valid start_time, cannot calculate totals accurately.");
       return { cashSales: 0, transactionsCount: 0, expectedCash: register.opening_amount };
    }

    // Calculate total cash sales since register start time
    const transactions = await offlineDB.transactions
      //.where('created_at').aboveOrEqual(register.start_time)
      .where('created_at').aboveOrEqual(toISOString(register.start_time))
      .toArray();
    
    // Filter for this employee and Cash payments that are NOT void
    const cashSales = transactions
      .filter(t => 
        t.employee_id === register.employee_id && 
        t.payment_method === 'cash' && 
        t.payment_status === 'paid'
      )
      .reduce((sum, t) => sum + t.total, 0);

    const expectedCash = register.opening_amount + cashSales;
    
    return {
      cashSales,
      transactionsCount: transactions.length,
      expectedCash
    };
  },

  async closeRegister(registerId: number, actualCash: number, notes?: string) {
    const register = await offlineDB.daily_registers.get(registerId);
    if (!register) throw new Error("Register not found");

    const { expectedCash } = await this.getRegisterTotals(register);
    const discrepancy = actualCash - expectedCash!;

    const updates = {
      closing_amount: actualCash,
      expected_cash: expectedCash,
      actual_cash: actualCash,
      discrepancy,
      status: 'closed' as const,
      end_time: new Date().toISOString(),
      notes
    };

    await offlineDB.daily_registers.update(registerId, updates);
    await logAuditAction('CLOSE_REGISTER', `Register:${registerId}`, updates);

    return updates;
  }
};