import { addDocument } from './firestore';
import { AuditLog } from '../../types';
import { getDatabase } from '../../db';

// Helper to get IP (best effort)
const getClientIp = async (): Promise<string> => {
  if (typeof navigator === 'undefined' || !navigator.onLine) return 'offline';
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (e) {
    return 'unknown';
  }
};

export const logAuditAction = async (
  action: string,
  resource: string,
  details: any,
  specificEmployeeId?: string
) => {
  try {
    const db = getDatabase();
    
    // Determine current user from local session storage if not provided
    let employee_id = specificEmployeeId || 'system';
    let employee_name = 'System';

    if (!specificEmployeeId) {
      if (typeof localStorage !== 'undefined') {
        const storage = localStorage.getItem('pos-auth-storage');
        if (storage) {
          const parsed = JSON.parse(storage);
          if (parsed.state?.user) {
            employee_id = parsed.state.user.id;
            employee_name = parsed.state.user.name;
          }
        }
      }
    }

    const ip_address = await getClientIp();

    const logEntry: AuditLog = {
      employee_id,
      employee_name,
      action,
      resource,
      timestamp: new Date().toISOString(),
      details,
      ip_address
    };

    // 1. Save locally first (critical for offline audit)
    await db.saveAuditLog(logEntry);

    // 2. Sync to Firebase if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
       await addDocument('audit_logs', logEntry);
    }
    
    console.log(`[Audit] ${action}:`, details);

  } catch (error) {
    console.error("Failed to write audit log", error);
  }
};

// Audit Log Retrieval Service
export const auditService = {
  async getLogs(filters: {
    startDate?: Date;
    endDate?: Date;
    employeeId?: string;
    action?: string;
    limit?: number;
  }) {
    const db = getDatabase();
    const logs = await db.getAuditLogs();

    let filtered = logs;

    if (filters.startDate && filters.endDate) {
       // Adjust end date to end of day
       const end = new Date(filters.endDate);
       end.setHours(23, 59, 59, 999);
       const start = new Date(filters.startDate);
       start.setHours(0,0,0,0);

       filtered = filtered.filter(l => {
         const d = new Date(l.timestamp);
         return d >= start && d <= end;
       });
    }

    if (filters.employeeId && filters.employeeId !== 'all') {
      filtered = filtered.filter(l => l.employee_id === filters.employeeId);
    }

    if (filters.action && filters.action !== 'all') {
      filtered = filtered.filter(l => l.action === filters.action);
    }

    return filtered.slice(0, filters.limit || 100);
  },

  async getSecurityMetrics() {
    const db = getDatabase();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    const allLogs = await db.getAuditLogs();
    const todaysLogs = allLogs.filter(l => {
      const logTime = typeof l.timestamp === 'string' ? l.timestamp : new Date(l.timestamp).toISOString();
      return logTime >= startOfDay;
    });

    const failedLogins = todaysLogs.filter(l => l.action === 'LOGIN_FAILED').length;
    const accountLocks = todaysLogs.filter(l => l.action === 'ACCOUNT_LOCKED').length;
    const voids = todaysLogs.filter(l => l.action === 'VOID_TRANSACTION').length;

    // Get locked accounts
    const employees = await db.getEmployees();
    const lockedAccounts = employees.filter(e => e.is_locked);

    return {
      failedLogins,
      accountLocks,
      voids,
      lockedAccounts
    };
  }
};