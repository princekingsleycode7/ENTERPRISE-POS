import { getDatabase } from '../../db';
import { Employee } from '../../types';

const MAX_ATTEMPTS = 5;

export const pinAuth = {
  // Hash PIN using SHA-256
  async hashPIN(pin: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      console.error('PIN hashing failed:', error);
      throw error;
    }
  },

  // Authenticate employee with locking logic
  async authenticateEmployee(pin: string): Promise<{ success: boolean; employee?: Employee; error?: string }> {
    try {
      const db = getDatabase();
      await db.init();
      const inputHash = await this.hashPIN(pin);
      
      // Get all active employees
      const employees = await db.getEmployees();
      
      // Find candidate by hash
      const candidate = employees.find(emp => emp.pin_hash === inputHash);
      
      if (candidate) {
        // Check if locked
        if (candidate.is_locked) {
          console.warn(`Login attempt on locked account: ${candidate.name}`);
          return { success: false, error: 'Account Locked. Contact Admin.' };
        }

        if (!candidate.active) {
          return { success: false, error: 'Account Deactivated.' };
        }

        // Success - Reset attempts if any existed
        if ((candidate.failed_attempts || 0) > 0) {
          await db.saveEmployee({ ...candidate, failed_attempts: 0 });
        }

        console.log(`Login successful: ${candidate.name}`);
        return { success: true, employee: candidate };
      } 
      
      console.warn('Login failed: Invalid PIN');
      return { success: false, error: 'Invalid PIN.' };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed.' };
    }
  },

  // Method to increment failure if we knew the user ID
  async recordFailure(employeeId: string) {
    try {
      const db = getDatabase();
      const emp = await db.getEmployee(employeeId);
      if (!emp) return;
      
      const newCount = (emp.failed_attempts || 0) + 1;
      const updates: Partial<Employee> = { failed_attempts: newCount };
      
      if (newCount >= MAX_ATTEMPTS) {
        updates.is_locked = true;
        console.warn(`Account locked after ${MAX_ATTEMPTS} failed attempts: ${emp.name}`);
      }
      
      await db.saveEmployee({ ...emp, ...updates });
    } catch (error) {
      console.error('Error recording failure:', error);
    }
  }
};
