'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated && !loading) {
        router.push('/login');
      }
    };

    verify();
  }, [loading, router, checkAuth]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null; // Will redirect in the useEffect
  }

  return <>{children}</>;
}