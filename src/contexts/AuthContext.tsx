'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, deviceId: string) => Promise<any>;
  logout: () => Promise<void>;
  verifyOtp: (email: string, code: string, deviceId: string) => Promise<any>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastChecked, setLastChecked] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();

  // On first load, check authentication status
  useEffect(() => {
    const initialAuthCheck = async () => {
      try {
        await checkSession();
      } catch (error) {
        console.error('Initial auth check error:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initialAuthCheck();
  }, []);
  
  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.isLoggedIn && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        setLastChecked(Date.now());
        return true;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Check session error:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  };
  
  const checkAuth = async (): Promise<boolean> => {
    // If we already have a user and were authenticated recently, don't do another check
    const now = Date.now();
    if (user && isAuthenticated && now - lastChecked < 60000) { // 1 minute cache
      return true;
    }
    
    return checkSession();
  };

  const login = async (email: string, password: string, deviceId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceId }),
      });
      
      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        // If not JSON, handle the error differently
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text);
          throw new Error('Server returned an invalid response');
        }
      }
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.requiresOTP) {
          // OTP required for first-time login
          setError('OTP required');
          return { requiresOTP: true };
        } else {
          // Already authenticated with cookie, fetch user
          await checkSession();
          // Use window.location for hard refresh to ensure cookie is properly recognized
          window.location.href = '/dashboard'; 
          return data;
        }
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // First update client-side state before API call
      // This ensures UI updates immediately
      setUser(null);
      setIsAuthenticated(false);
      setLastChecked(0);
      
      // For extra assurance, clear any cached state
      localStorage.removeItem('lastChecked');
      
      // Then call logout API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Important for cookies
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error('Logout failed:', text);
        // Don't throw here, we've already cleared the UI state
      }
      
      // Force a hard page reload to truly reset everything
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      // Even if there's an error, redirect to login for better UX
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email: string, code: string, deviceId: string) => {
    try {
      console.log('Starting OTP verification for:', email);
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, deviceId }),
      });
      
      // Handle non-JSON responses
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text);
          throw new Error('Server returned an invalid response');
        }
      }
      
      const data = await response.json();
      
      console.log('OTP verification response:', data);
      
      if (response.ok && data.verified) {
        console.log('OTP verified successfully');
        
        // Update authentication state
        setUser({
          _id: data.userId,
          email: data.email,
          name: data.name || data.email
        });
        setIsAuthenticated(true);
        setLastChecked(Date.now());
        
        // Use window.location for hard refresh to ensure cookie is properly recognized
        window.location.href = '/dashboard';
        return data;
      } else {
        throw new Error(data.error || 'OTP verification failed');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error instanceof Error ? error.message : 'OTP verification failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      isAuthenticated,
      login,
      logout,
      verifyOtp,
      checkAuth
    }}>
      {!isInitializing ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}