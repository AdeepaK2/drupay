'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, ReactNode } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { isAuthenticated, checkAuth, user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  
  useEffect(() => {
    // Avoid re-running this effect if we've already completed an auth check
    if (hasCheckedAuth) {
      return;
    }
    
    // If already authenticated with user data, no need to check
    if (isAuthenticated && user) {
      setIsChecking(false);
      setHasCheckedAuth(true);
      return;
    }
    
    const verifyAuth = async () => {
      try {
        const timeoutId = setTimeout(() => {
          console.log("Auth check timed out in protected route");
          window.location.replace('/login');
        }, 5000);
        
        const isAuthed = await checkAuth();
        
        clearTimeout(timeoutId);
        
        if (!isAuthed) {
          console.log("User not authenticated, redirecting to login");
          window.location.replace('/login');
          return;
        }
        
        setIsChecking(false);
        setHasCheckedAuth(true);
      } catch (error) {
        console.error('Auth check error in protected route:', error);
        window.location.replace('/login');
      }
    };
    
    verifyAuth();
  }, [checkAuth, isAuthenticated, user, hasCheckedAuth]);
  
  // Show loading state during initial check
  if (isChecking) {
    return <LoadingSpinner />;
  }
  
  return <>{children}</>;
}