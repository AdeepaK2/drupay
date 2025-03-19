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
  requiresOTP: boolean;
  otpEmail: string;
  deviceId: string;
  login: (email: string, password: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
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

  // Check auth status on mount
  useEffect(() => {
    checkAuth().finally(() => setLoading(false));
  }, []);

  const checkAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.isLoggedIn && data.user) {
        setUser(data.user);
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.requiresOTP) {
          // OTP required for first-time login
          setRequiresOTP(true);
          setOtpEmail(email);
        } else {
          // Already authenticated with cookie, fetch user
          await checkAuth();
          router.push('/dashboard');
        }
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (code: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail,
          code,
          deviceId,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.verified) {
        setRequiresOTP(false);
        await checkAuth();
        router.push('/dashboard');
      } else {
        throw new Error(data.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        requiresOTP,
        otpEmail,
        deviceId,
        login,
        verifyOTP,
        logout,
        checkAuth,
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