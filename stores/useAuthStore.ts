import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, Permission, Role } from '../types';
import { pinAuth } from '../services/auth/pinAuth';

// Define permissions per role
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  cashier: ['process_sale'],
  manager: ['process_sale', 'void_transaction', 'manage_inventory', 'view_reports'],
  admin: ['process_sale', 'void_transaction', 'manage_inventory', 'view_reports', 'manage_settings', 'manage_employees', 'view_audit_logs']
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      merchantId: null,
      isAuthenticated: false,
      lastActivity: Date.now(),
      
      login: async (pin: string) => {
        try {
          const result = await pinAuth.authenticateEmployee(pin);
          
          if (result.success && result.employee) {
            set({
              user: { 
                id: result.employee.id!, 
                name: result.employee.name, 
                role: result.employee.role,
                merchantId: result.employee.merchant_id
              },
              merchantId: result.employee.merchant_id || null,
              isAuthenticated: true,
              lastActivity: Date.now()
            });
            return true;
          }
          
          return result.error || false;
        } catch (e) {
          console.error("Login error", e);
          return false;
        }
      },

      logout: () => {
         // Log logout before clearing state (handled in component usually, but good practice)
         set({ user: null, merchantId: null, isAuthenticated: false });
      },

      updateActivity: () => set({ lastActivity: Date.now() }),

      hasPermission: (permission: Permission) => {
        const { user } = get();
        if (!user) return false;
        const permissions = ROLE_PERMISSIONS[user.role] || [];
        return permissions.includes(permission);
      }
    }),
    {
      name: 'pos-auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        merchantId: state.merchantId,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity
      }),
    }
  )
);