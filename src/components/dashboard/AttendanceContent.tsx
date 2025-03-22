'use client';

import React, { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { CalendarIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

export default function AttendanceContent() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Helper function for haptic feedback
  const triggerVibration = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerVibration();
    
    // Simulate refresh with timeout
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedDown: (eventData) => {
      if (eventData.initial[1] < 60) {
        handleRefresh();
      }
    },
    delta: 50,
    preventScrollOnSwipe: false,
    trackMouse: false
  });

  // Attendance records data
  const attendanceRecords = [
    {
      id: 1,
      date: 'Mar 20, 2025',
      className: 'Mathematics 101',
      present: 22,
      absent: 2,
    },
    {
      id: 2,
      date: 'Mar 19, 2025',
      className: 'Physics Advanced',
      present: 16,
      absent: 2,
    },
    {
      id: 3,
      date: 'Mar 18, 2025',
      className: 'Chemistry Fundamentals',
      present: 18,
      absent: 3,
    },
    {
      id: 4,
      date: 'Mar 17, 2025',
      className: 'English Literature',
      present: 24,
      absent: 0,
    }
  ];

  return (
    <div className="space-y-6 pb-16" {...swipeHandlers}>
      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="flex justify-center items-center pb-4">
          <div className="h-6 w-6 border-2 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold mb-1">Attendance Management</h2>
          <p className="text-gray-600 text-sm">
            Track and manage student attendance records
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="relative">
              <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Class
              </label>
              <div className="relative">
                <select 
                  id="class-select"
                  className="appearance-none block w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    triggerVibration();
                  }}
                >
                  <option value="">All Classes</option>
                  <option value="math">Mathematics 101</option>
                  <option value="physics">Physics Advanced</option>
                  <option value="chemistry">Chemistry Fundamentals</option>
                  <option value="english">English Literature</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="attendance-date" className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  id="attendance-date"
                  type="date" 
                  className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    triggerVibration();
                  }}
                />
              </div>
            </div>
            
            <button 
              className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-medium active:bg-indigo-800 flex justify-center items-center transition-colors"
              onClick={() => triggerVibration()}
            >
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Take Attendance
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Attendance Records</h3>
        </div>
        
        {/* Desktop view - table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{record.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{record.className}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-1" />
                      {record.present}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <XCircleIcon className="h-5 w-5 text-red-500 mr-1" />
                      {record.absent}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
                      onClick={() => triggerVibration()}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile view - cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {attendanceRecords.map((record) => (
            <div key={record.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-900">{record.className}</h4>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {record.date}
                  </div>
                </div>
                <button
                  className="p-2 rounded-full hover:bg-indigo-50 text-indigo-600"
                  onClick={() => triggerVibration()}
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 flex items-center space-x-6">
                <div className="flex items-center text-sm">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600 mr-2">
                    <CheckCircleIcon className="h-4 w-4" />
                  </div>
                  <span>{record.present} present</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 mr-2">
                    <XCircleIcon className="h-4 w-4" />
                  </div>
                  <span>{record.absent} absent</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* View all link */}
        <div className="border-t border-gray-200 p-4">
          <button 
            className="w-full py-3 flex items-center justify-center text-indigo-600 hover:text-indigo-800 font-medium"
            onClick={() => triggerVibration()}
          >
            View All Attendance Records
            <ChevronRightIcon className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Quick action button for mobile */}
      <div className="fixed bottom-20 right-4 md:hidden">
        <button
          className="bg-indigo-600 text-white h-14 w-14 rounded-full shadow-lg flex items-center justify-center active:bg-indigo-700"
          aria-label="Take attendance now"
          onClick={() => triggerVibration()}
        >
          <UserGroupIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}