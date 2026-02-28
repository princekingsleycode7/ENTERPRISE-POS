import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { adminAuthService } from '../services/admin/adminAuthService';

export interface AdminAuthStore {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: FirebaseUser | null, role?: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAdminAuthStore = create<AdminAuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  role: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await adminAuthService.signIn(email, password);
      
      if (result.success) {
        // Check if user has platform_admin role
        const hasAdminRole = await adminAuthService.hasPlatformAdminRole();
        
        if (!hasAdminRole) {
          await adminAuthService.signOut();
          set({ isLoading: false });
          return { 
            success: false, 
            error: 'User does not have platform admin permissions' 
          };
        }

        const user = adminAuthService.getCurrentUser();
        set({ 
          user,
          isAuthenticated: true,
          role: 'platform_admin',
          isLoading: false
        });
        return { success: true };
      } else {
        set({ isLoading: false });
        return result;
      }
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: 'Sign in failed' };
    }
  },

  logout: async () => {
    try {
      await adminAuthService.signOut();
      set({ 
        user: null, 
        isAuthenticated: false, 
        role: null 
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  setUser: (user: FirebaseUser | null, role: string | null = null) => {
    set({ 
      user,
      isAuthenticated: user !== null,
      role: user ? role : null,
      isLoading: false
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  }
}));

// Initialize auth state from Firebase
adminAuthService.onAuthStateChanged(async (user) => {
  if (user) {
    const hasAdminRole = await adminAuthService.hasPlatformAdminRole();
    useAdminAuthStore.getState().setUser(user, hasAdminRole ? 'platform_admin' : null);
  } else {
    useAdminAuthStore.getState().setUser(null);
  }
});
