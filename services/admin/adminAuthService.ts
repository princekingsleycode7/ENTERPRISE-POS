import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../firebase/config';

export interface AdminAuthState {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Admin Authentication Service
 * Handles Firebase email/password authentication for platform admins
 */
export const adminAuthService = {
  /**
   * Sign in admin with email and password
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      console.error('Admin sign in error:', error);
      let errorMessage = 'Sign in failed';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Email not found';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Account is disabled';
      }
      
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Sign out the current admin
   */
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  /**
   * Get current admin user
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Get ID token for the current user
   */
  async getIdToken(): Promise<string | null> {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  },

  /**
   * Check if user has platform_admin role
   */
  async hasPlatformAdminRole(): Promise<boolean> {
    if (!auth.currentUser) return false;
    
    try {
      const idTokenResult = await auth.currentUser.getIdTokenResult(true);
      return idTokenResult.claims.role === 'platform_admin';
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  }
};
