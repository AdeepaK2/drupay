'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Welcome, {user?.name || 'User'}!</h2>
              <p className="text-gray-600">Email: {user?.email}</p>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium mb-3">Your Account</h3>
              {/* Dashboard content here */}
              <p className="text-gray-700">
                You've successfully logged in to the protected dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}