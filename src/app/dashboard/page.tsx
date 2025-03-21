'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import DashboardSideBar from '@/components/DashboardSideBar';
import {
  HomeContent,
  ClassesContent,
  StudentsContent,
  CentersContent,
  AttendanceContent,
  MessagesContent
} from '@/components/dashboard';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      // Logout function handles the redirect
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  // Show loading spinner if we're still loading user data
  if (loading && !user) {
    return <LoadingSpinner />;
  }

  // Render content based on the active section
  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <HomeContent user={user} />;
      case 'classes':
        return <ClassesContent />;
      case 'students':
        return <StudentsContent />;
      case 'centers':
        return <CentersContent />;
      case 'attendance':
        return <AttendanceContent />;
      case 'messages':
        return <MessagesContent />;
      default:
        return <HomeContent user={user} />;
    }
  };

  // If we get this far, authentication was already verified by ProtectedLayout
  return (
    <ProtectedLayout>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
        {/* Sidebar */}
        <DashboardSideBar 
          onLogout={handleLogout} 
          isLoggingOut={isLoggingOut} 
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
        
        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 mt-16 md:mt-0">
          {renderContent()}
        </div>
      </div>
    </ProtectedLayout>
  );
}