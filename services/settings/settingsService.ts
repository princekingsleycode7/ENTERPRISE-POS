import { offlineDB } from '../offline/db';
import { Settings, Employee, Role } from '../../types';
import { updateDocument, addDocument, setDocument, getDocument } from '../firebase/firestore';
import { logAuditAction } from '../firebase/audit';
import { pinAuth } from '../auth/pinAuth';
import { ENV } from '../../config/env';

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
  ,
  // default moniepoint terminal serial from environment (can be empty)
  moniepoint_terminal_serial: ENV.MONIEPOINT.DEFAULT_TERMINAL_SERIAL || ''
};

export const settingsService = {

  // --- Settings Management ---

  async getSettings(): Promise<Settings> {
    const settingId = localStorage.getItem('bound_merchant_id') || 'global';
    let settings = await offlineDB.settings.get(settingId);
    if (!settings) {
      // Initialize defaults
      settings = { ...DEFAULT_SETTINGS, id: settingId };
      await offlineDB.settings.put(settings);
    }
    return settings;
  },

  async updateSettings(updates: Partial<Settings>, adminId: string) {
    const settingId = localStorage.getItem('bound_merchant_id') || 'global';
    const current = await this.getSettings();
    const newData = { ...current, ...updates, id: settingId };

    // Update local DB
    await offlineDB.settings.put(newData);

    // Sync to Firebase (Store as a doc in 'settings' collection)
    if (navigator.onLine) {
      await setDocument('settings', settingId, newData);
    }

    // Log Audit
    const changedKeys = Object.keys(updates).join(', ');
    await logAuditAction('UPDATE_SETTINGS', 'Global Settings', {
      changed_fields: changedKeys,
      updated_by: adminId
    });

    return newData;
  },

  async syncSettingsFromFirebase() {
    try {
      const settingId = localStorage.getItem('bound_merchant_id') || 'global';
      const settings = await getDocument('settings', settingId);
      if (settings) {
        await offlineDB.settings.put(settings);
        return settings;
      }
    } catch (error) {
      console.error('Error syncing settings from Firebase:', error);
    }
    return null;
  },

  // --- Employee Management ---

  async getAllEmployees(): Promise<Employee[]> {
    return await offlineDB.employees.toArray();
  },

  async addEmployee(employee: Omit<Employee, 'id'>, adminId: string) {
    // 1. Save to Firebase
    let firebaseId: string;
    let savedDoc: any;
    try {
      savedDoc = await addDocument('employees', {
        ...employee,
        created_at: new Date().toISOString()
      });
      firebaseId = savedDoc.id;
    } catch (e) {
      // Offline fallback: generate a temp ID
      firebaseId = `local_${Date.now()}`;
      savedDoc = { ...employee, id: firebaseId, merchant_id: localStorage.getItem('bound_merchant_id') || undefined };
    }

    const newEmployee = savedDoc as Employee;

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