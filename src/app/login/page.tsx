'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Login() {
  const { login, verifyOtp, error: authError, loading, user, checkAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const router = useRouter();

  // Get device ID from localStorage
  const getDeviceId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('deviceId') || '';
    }
    return '';
  };

  useEffect(() => {
    // Check if user is already logged in
    const checkIfLoggedIn = async () => {
      try {
        const isAuthed = await checkAuth();
        console.log("Authentication check result:", isAuthed);
        
        if (isAuthed) {
          console.log("User is authenticated, redirecting to dashboard");
          router.push('/dashboard');
        }
      } catch (err) {
        console.error("Auth check error:", err);
      }
    };
    
    checkIfLoggedIn();
  }, [checkAuth, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      const deviceId = getDeviceId();
      
      const result = await login(email, password, deviceId);
      
      // If login requires OTP
      if (result && result.requiresOTP) {
        setRequiresOTP(true);
        setOtpEmail(email);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      const deviceId = getDeviceId();
      
      // Call verifyOtp and handle the response
      await verifyOtp(otpEmail || email, otp, deviceId);
      
      // If successful (verifyOtp doesn't throw), redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">DrUPay</h1>
          <p className="mt-2 text-gray-600">
            {requiresOTP ? 'Enter verification code' : 'Sign in to your account'}
          </p>
        </div>

        {(error || authError) && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {error || authError}
          </div>
        )}

        {requiresOTP ? (
          <form onSubmit={handleOtpVerify} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <div className="mt-1">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  placeholder="Enter the 6-digit code"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                A verification code has been sent to {otpEmail}
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-sm text-center">
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Don't have an account? Register
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}