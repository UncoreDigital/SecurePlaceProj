// Session validation utilities
import { loadUserDetailLocalStorage } from "@/hooks/useUser";

export interface SessionValidationResult {
  isValid: boolean;
  user: any | null;
  reason?: string;
}

/**
 * Validates the current user session
 * @param strict - If true, performs strict validation. If false, more lenient for login process
 * @returns SessionValidationResult with validation status and user data
 */
export function validateSession(strict: boolean = true): SessionValidationResult {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return { isValid: false, user: null, reason: 'Server-side rendering' };
    }

    // Load user session from localStorage
    const userSession = loadUserDetailLocalStorage();
    
    if (!userSession || !userSession.user) {
      return { isValid: false, user: null, reason: 'No session found' };
    }

    // Check if session is expired (only in strict mode)
    if (strict) {
      const now = Date.now();
      if (userSession.expiresAt && now > userSession.expiresAt) {
        // Clear expired session
        localStorage.removeItem('secure_place_user_session');
        return { isValid: false, user: null, reason: 'Session expired' };
      }
    }

    // Validate user data structure (more lenient in non-strict mode)
    const user = userSession.user;
    if (!user.id || !user.email) {
      return { isValid: false, user: null, reason: 'Invalid user data' };
    }

    // In strict mode, require role. In non-strict mode, role is optional
    if (strict && !user.role) {
      return { isValid: false, user: null, reason: 'Missing user role' };
    }

    return { isValid: true, user, reason: 'Valid session' };
    
  } catch (error) {
    console.error('Session validation error:', error);
    return { isValid: false, user: null, reason: 'Validation error' };
  }
}

/**
 * Redirects user to appropriate dashboard based on their role
 * @param user User object with role information
 */
export function redirectToDashboard(user: any) {
  const role = user.role;
  
  if (role === 'super_admin') {
    window.location.href = '/super-admin-dashboard';
  } else if (role === 'firm_admin') {
    window.location.href = '/firm-admin-dashboard';
  } else {
    window.location.href = '/employees'; // Default dashboard
  }
}

/**
 * Redirects user to login page
 */
export function redirectToLogin() {
  window.location.href = '/';
}

/**
 * Clears all session data and redirects to login
 */
export function clearSessionAndRedirect() {
  try {
    // Clear main session
    localStorage.removeItem('secure_place_user_session');
    
    // Clear other auth-related storage
    const authKeys = ['supabase.auth.token', 'sb-auth-token'];
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
  } catch (error) {
    console.warn('Error clearing session:', error);
  } finally {
    redirectToLogin();
  }
}

/**
 * Sets up session monitoring for cross-tab logout detection
 * @param onSessionLost Callback when session is lost
 */
export function setupSessionMonitoring(onSessionLost?: () => void) {
  if (typeof window === 'undefined') return;

  // Listen for storage changes (logout in another tab)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'secure_place_user_session' && !e.newValue) {
      console.log('🔄 Session cleared in another tab');
      onSessionLost ? onSessionLost() : redirectToLogin();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Periodic session validation (every 60 seconds)
  const sessionCheckInterval = setInterval(() => {
    const { isValid, reason } = validateSession();
    if (!isValid) {
      console.log('🔄 Periodic session check failed:', reason);
      onSessionLost ? onSessionLost() : redirectToLogin();
    }
  }, 60000); // 60 seconds
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    clearInterval(sessionCheckInterval);
  };
}