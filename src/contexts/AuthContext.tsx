'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
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
  logout: () => Promise<void>; // Modified to not require deviceId
  verifyOtp: (email: string, code: string, deviceId: string) => Promise<any>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastChecked, setLastChecked] = useState(0);
  const [deviceId, setDeviceId] = useState('');
  const router = useRouter();

  // Generate a device ID if one doesn't exist
  useEffect(() => {
    const storedDeviceId = localStorage.getItem('deviceId');
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    } else {
      const newDeviceId = `device_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('deviceId', newDeviceId);
      setDeviceId(newDeviceId);
    }
  }, []);

  // Check session status with throttling (only check once every 5 minutes)
  const checkSession = async () => {
    const now = Date.now();
    // Only check if it's been more than 5 minutes since last check
    if (now - lastChecked < 300000 && lastChecked !== 0) {
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch('/api/auth/session', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      const data = await res.json();
      
      if (data.isLoggedIn && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      
      setLastChecked(now);
    } catch (err) {
      console.error('Session check error:', err);
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  // Initial check on mount
  useEffect(() => {
    checkSession();
    
    // Optional: Check session when window regains focus
    // This helps keep auth state fresh when user returns to the tab
    const handleFocus = () => {
      checkSession();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

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
      
      // Call logout API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Check if the request was successful
      if (!response.ok) {
        const text = await response.text();
        console.error('Logout failed:', text);
        throw new Error('Logout failed');
      }
      
      // Clear auth state regardless of response
      setUser(null);
      setIsAuthenticated(false);
      setLastChecked(0);
      
      // For extra assurance, also clear any cached state
      localStorage.removeItem('lastChecked');
      
      // Use window.location for hard refresh to ensure cookie is properly cleared
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated,
        login,
        verifyOtp,
        logout,
        checkAuth: async () => {  // Add this function
          await checkSession();
          return isAuthenticated;
        }
      }}
    >
      {children}
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