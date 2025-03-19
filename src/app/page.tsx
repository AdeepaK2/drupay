'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Home() {
  const { user, loading, checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      if (loading) return;
      
      const isAuthenticated = await checkAuth();
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    };

    redirect();
  }, [loading, router, checkAuth]);

  return <LoadingSpinner />;
}