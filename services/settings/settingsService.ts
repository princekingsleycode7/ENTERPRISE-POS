import { offlineDB } from '../offline/db';
import { Settings, Employee, Role } from '../../types';
import { updateDocument, addDocument } from '../firebase/firestore';
import { logAuditAction } from '../firebase/audit';
import { pinAuth } from '../auth/pinAuth';

const DEFAULT_SETTINGS: Settings = {
  id: 'global',
  store_name: 'Modern POS Store',
  address: '123 Main Street, Lagos, Nigeria',
  phone: '+234 800 000 0000',
  currency: 'NGN',
  tax_rate: 0.075, // 7.5%
  tax_enabled: true,
  tax_label: 'VAT',
  receipt_header: 'Welcome to our store',
  receipt_footer: 'Thank you for your business!',
  show_tax_breakdown: true,
  paper_width: '58mm',
  low_stock_threshold: 10,
  auto_sync_interval: 5,
  session_timeout: 30
};

export const settingsService = {
  
  // --- Settings Management ---

  async getSettings(): Promise<Settings> {
    let settings = await offlineDB.settings.get('global');
    if (!settings) {
      // Initialize defaults
      settings = DEFAULT_SETTINGS;
      await offlineDB.settings.put(settings);
    }
    return settings;
  },

  async updateSettings(updates: Partial<Settings>, adminId: string) {
    const current = await this.getSettings();
    const newData = { ...current, ...updates };
    
    // Update local DB
    await offlineDB.settings.put(newData);

    // Sync to Firebase (Store as a doc in 'settings' collection)
    if (navigator.onLine) {
       await updateDocument('settings', 'global', newData);
    }

    // Log Audit
    const changedKeys = Object.keys(updates).join(', ');
    await logAuditAction('UPDATE_SETTINGS', 'Global Settings', {
      changed_fields: changedKeys,
      updated_by: adminId
    });

    return newData;
  },

  // --- Employee Management ---

  async getAllEmployees(): Promise<Employee[]> {
    return await offlineDB.employees.toArray();
  },

  async addEmployee(employee: Omit<Employee, 'id'>, adminId: string) {
    // 1. Save to Firebase
    let firebaseId: string;
    try {
      const doc = await addDocument('employees', {
        ...employee,
        created_at: new Date().toISOString()
      });
      firebaseId = doc.id;
    } catch (e) {
      // Offline fallback: generate a temp ID
      firebaseId = `local_${Date.now()}`;
    }

    const newEmployee = { ...employee, id: firebaseId };
    
    // 2. Save Local
    await offlineDB.employees.add(newEmployee);

    // 3. Log
    await logAuditAction('ADD_EMPLOYEE', `Employee:${newEmployee.name}`, {
      role: newEmployee.role,
      admin_id: adminId
    });

    return newEmployee;
  },

  async updateEmployee(id: string, updates: Partial<Employee>, adminId: string) {
    // 1. Update Firebase
    if (navigator.onLine && !id.startsWith('local_')) {
      await updateDocument('employees', id, updates);
    }

    // 2. Update Local
    await offlineDB.employees.update(id, updates);

    // 3. Log
    await logAuditAction('UPDATE_EMPLOYEE', `Employee:${id}`, {
      updates,
      admin_id: adminId
    });
  },

  async resetEmployeePin(id: string, newPin: string, adminId: string) {
    const pinHash = await pinAuth.hashPIN(newPin);
    await this.updateEmployee(id, { pin_hash: pinHash, is_locked: false, failed_attempts: 0 }, adminId);
    
    await logAuditAction('RESET_PIN', `Employee:${id}`, {
      admin_id: adminId
    });
  },

  async unlockEmployee(id: string, adminId: string) {
    await this.updateEmployee(id, { is_locked: false, failed_attempts: 0 }, adminId);
    await logAuditAction('ACCOUNT_UNLOCKED', `Employee:${id}`, {
      admin_id: adminId
    });
  },

  async deactivateEmployee(id: string, adminId: string) {
    await this.updateEmployee(id, { active: false }, adminId);
    await logAuditAction('DEACTIVATE_EMPLOYEE', `Employee:${id}`, {
      admin_id: adminId
    });
  },

  async activateEmployee(id: string, adminId: string) {
    await this.updateEmployee(id, { active: true }, adminId);
    await logAuditAction('ACTIVATE_EMPLOYEE', `Employee:${id}`, {
      admin_id: adminId
    });
  }
};