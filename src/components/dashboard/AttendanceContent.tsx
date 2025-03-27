'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { CalendarIcon, ClockIcon, UserGroupIcon, CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ChevronRightIcon, ChartBarIcon } from '@heroicons/react/24/solid';

// Interface definitions
interface Class {
  _id: string;
  classId: string;
  name: string;
  grade: number;
  subject: string;
  centerId: number;
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
  };
}

interface Student {
  sid: string;
  name: string;
}

interface Attendance {
  sid: string;
  present: boolean;
  notes?: string;
}

interface Schedule {
  _id: string;
  classId: string;
  date: string;
  month: number;
  year: number;
  dayOfWeek: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  notes?: string;
  attendance: Attendance[];
  createdAt: string;
  updatedAt: string;
}

export default function AttendanceContent() {
  // Add a new state for active tab
  const [activeTab, setActiveTab] = useState<'mark' | 'view'>('mark');
  
  // State variables
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Schedule[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<{[key: string]: boolean}>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  
  const studentListRef = useRef<HTMLDivElement>(null);
  const sessionNotesRef = useRef<HTMLTextAreaElement>(null);

  // Helper function for haptic feedback
  const triggerVibration = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // Load all classes when component mounts
  useEffect(() => {
    fetchClasses();
  }, []);
  
  // Fetch recent attendance records
  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  // When class or date changes, check for existing schedule
  useEffect(() => {
    if (selectedClass) {
      checkExistingSchedule();
    }
  }, [selectedClass, selectedDate]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerVibration();
    
    await Promise.all([
      fetchClasses(),
      fetchAttendanceRecords()
    ]);
    
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

  // Fetch all classes
  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/class');
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }
      
      const data = await response.json();
      setClasses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load classes');
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch attendance records
  const fetchAttendanceRecords = async (year?: number, month?: number) => {
    try {
      const today = new Date();
      year = year || today.getFullYear();
      month = month || today.getMonth() + 1;
      
      let queryParams = `year=${year}&month=${month}`;
      
      // Add class filter if one is selected
      if (selectedClass) {
        queryParams += `&classId=${selectedClass.classId}`;
      }
      
      const response = await fetch(`/api/schedule?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      
      const data = await response.json();
      
      // Sort by date descending (newest first)
      const sortedRecords = Array.isArray(data) 
        ? data.sort((a: Schedule, b: Schedule) => 
            new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];
      
      setAttendanceRecords(sortedRecords);
    } catch (err) {
      console.error('Error fetching attendance records:', err);
    }
  };

  // Check if a schedule exists for the selected class and date
  const checkExistingSchedule = async () => {
    if (!selectedClass) return;
    
    try {
      setLoadingStudents(true);
      
      // Convert date to YYYY-MM-DD format
      const formattedDate = selectedDate;
      
      // Fetch schedule for this class and date
      const response = await fetch(
        `/api/schedule?classId=${selectedClass.classId}&date=${formattedDate}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to check schedule');
      }
      
      const schedules = await response.json();
      
      if (Array.isArray(schedules) && schedules.length > 0) {
        // Schedule exists, use it
        setSelectedSchedule(schedules[0]);
        
        // Setup attendance map
        const attendanceObj: {[key: string]: boolean} = {};
        schedules[0].attendance.forEach((a: Attendance) => {
          attendanceObj[a.sid] = a.present;
        });
        setAttendanceMap(attendanceObj);
        
        // Get enrolled students (if needed)
        await fetchEnrolledStudents();
      } else {
        // No schedule exists yet
        setSelectedSchedule(null);
        await fetchEnrolledStudents();
      }
    } catch (err: any) {
      console.error('Error checking schedule:', err);
      setError(err.message || 'Error checking schedule');
    } finally {
      setLoadingStudents(false);
    }
  };
  
  // Fetch students enrolled in the selected class
  const fetchEnrolledStudents = async () => {
    if (!selectedClass) return;
    
    try {
      const response = await fetch(`/api/enrollment?classId=${selectedClass.classId}&status=active`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch enrolled students');
      }
      
      const data = await response.json();
      const enrollments = data.enrollments || [];
      
      // Extract student information
      const studentList = enrollments.map((enrollment: any) => ({
        sid: enrollment.student.sid,
        name: enrollment.student.name
      }));
      
      setStudents(studentList);
      
      // Initialize attendance map if no existing schedule
      if (!selectedSchedule) {
        const newAttendanceMap: {[key: string]: boolean} = {};
        studentList.forEach((student: Student) => {
          newAttendanceMap[student.sid] = false;
        });
        setAttendanceMap(newAttendanceMap);
      }
    } catch (err: any) {
      console.error('Error fetching enrolled students:', err);
      setError(err.message || 'Error fetching enrolled students');
    }
  };

  // Handle class selection
  const handleClassSelect = (classObj: Class | null) => {
    triggerVibration();
    setSelectedClass(classObj);
    
    if (classObj && studentListRef.current) {
      setTimeout(() => {
        studentListRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Toggle student attendance
  const toggleAttendance = (sid: string) => {
    triggerVibration();
    setAttendanceMap(prev => ({
      ...prev,
      [sid]: !prev[sid]
    }));
  };

  // Save attendance
  const saveAttendance = async () => {
    if (!selectedClass) return;
    
    try {
      setSavingAttendance(true);
      triggerVibration();
      setError(null);
      
      // Create attendance array
      const attendanceArray = students.map(student => ({
        sid: student.sid,
        present: !!attendanceMap[student.sid],
        notes: "" // You can add UI for notes if needed
      }));
      
      let response;
      
      if (selectedSchedule) {
        // Update existing schedule
        response = await fetch('/api/schedule', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _id: selectedSchedule._id,
            attendanceUpdates: attendanceArray,
            status: 'completed', // Update the status to completed
            notes: sessionNotesRef.current?.value || "" // Optional: Add notes about this session
          })
        });
      } else {
        // Create new schedule
        const scheduleDate = new Date(selectedDate);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[scheduleDate.getDay()];
        
        response = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: selectedClass.classId,
            date: selectedDate,
            dayOfWeek,
            status: 'completed', // Mark as completed right away
            startTime: selectedClass.schedule.startTime,
            endTime: selectedClass.schedule.endTime,
            attendance: attendanceArray,
            notes: sessionNotesRef.current?.value || "" // Optional: Add notes about this session
          })
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save attendance');
      }
      
      const data = await response.json();
      setSelectedSchedule(data);
      setSuccess('Attendance saved successfully!');
      
      // Refresh attendance records
      fetchAttendanceRecords();
      
      // Clear success message after a few seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving attendance');
      console.error('Error saving attendance:', err);
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <div className="space-y-6 pb-20" {...swipeHandlers}>
      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="flex justify-center items-center pb-4">
          <div className="h-6 w-6 border-2 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-4 animate-fadeIn">
          <span className="block sm:inline">{success}</span>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4 animate-fadeIn">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Tab navigation */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold mb-1">Attendance Management</h2>
          <p className="text-gray-600 text-sm mb-4">
            Track and manage student attendance records
          </p>
          
          {/* Tab buttons */}
          <div className="flex border-b border-gray-200">
            <button
              className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                activeTab === 'mark' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('mark')}
            >
              <PencilIcon className="inline-block h-4 w-4 mr-1" />
              Mark Attendance
            </button>
            
            <button
              className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                activeTab === 'view' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('view')}
            >
              <ChartBarIcon className="inline-block h-4 w-4 mr-1" />
              View Records
            </button>
          </div>
        </div>
        
        {/* Tab content */}
        {activeTab === 'mark' ? (
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
                    value={selectedClass?.classId || ""}
                    onChange={(e) => {
                      const classId = e.target.value;
                      const classObj = classes.find(c => c.classId === classId) || null;
                      handleClassSelect(classObj);
                    }}
                    disabled={loading}
                  >
                    <option value="">Select a class</option>
                    {classes.map((classObj) => (
                      <option key={classObj.classId} value={classObj.classId}>
                        {classObj.name} - {classObj.subject} (Grade {classObj.grade})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a 1 1 0 01-1.414 0l-4-4a 1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                {loading && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center">
                    <div className="mr-2 h-4 w-4 border-2 border-gray-300 rounded-full border-t-gray-600 animate-spin"></div>
                    Loading classes...
                  </div>
                )}
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
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex flex-col space-y-4">
              {/* Filter options for viewing records */}
              <div className="relative">
                <label htmlFor="view-class-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Class
                </label>
                <div className="relative">
                  <select 
                    id="view-class-select"
                    className="appearance-none block w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    onChange={(e) => {
                      const classId = e.target.value;
                      if (classId) {
                        const classObj = classes.find(c => c.classId === classId) || null;
                        setSelectedClass(classObj);
                      } else {
                        setSelectedClass(null);
                      }
                    }}
                    disabled={loading}
                  >
                    <option value="">All Classes</option>
                    {classes.map((classObj) => (
                      <option key={classObj.classId} value={classObj.classId}>
                        {classObj.name} - {classObj.subject} (Grade {classObj.grade})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a 1 1 0 01-1.414 0l-4-4a 1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="view-month" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Month
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    id="view-month"
                    type="month" 
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    defaultValue={new Date().toISOString().slice(0, 7)}
                    onChange={(e) => {
                      // Extract year and month from the input value
                      const [year, month] = e.target.value.split('-').map(Number);
                      // Then fetch records for this year/month
                      fetchAttendanceRecords(year, month);
                      triggerVibration();
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Student attendance list - only show in mark tab */}
      {activeTab === 'mark' && selectedClass && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden animate-fadeIn" ref={studentListRef}>
          <div className="p-6 border-b border-gray-200 bg-indigo-50">
            <h3 className="text-lg font-semibold text-indigo-900">
              {selectedClass.name} - {formatDate(selectedDate)}
            </h3>
            <p className="text-indigo-700 text-sm mt-1">
              {selectedClass.subject} (Grade {selectedClass.grade})
            </p>
            {selectedSchedule && (
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Attendance record exists
              </div>
            )}
          </div>
          
          {loadingStudents ? (
            <div className="p-8 flex justify-center">
              <div className="h-8 w-8 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
          ) : students.length > 0 ? (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.map((student) => (
                  <div 
                    key={student.sid}
                    className={`border rounded-lg p-4 flex justify-between items-center transition-colors ${
                      attendanceMap[student.sid] ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                    onClick={() => toggleAttendance(student.sid)}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        attendanceMap[student.sid] ? 'bg-green-100 text-green-500' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {attendanceMap[student.sid] ? (
                          <CheckIcon className="h-5 w-5" />
                        ) : (
                          <XMarkIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">ID: {student.sid}</div>
                      </div>
                    </div>
                    <div>
                      <button 
                        className={`p-2 rounded-full ${
                          attendanceMap[student.sid] 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        aria-label={attendanceMap[student.sid] ? 'Mark as absent' : 'Mark as present'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAttendance(student.sid);
                        }}
                      >
                        {attendanceMap[student.sid] ? (
                          <CheckCircleIcon className="h-6 w-6" />
                        ) : (
                          <XCircleIcon className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg font-medium active:bg-indigo-800 flex items-center justify-center transition-colors w-full md:w-auto"
                  onClick={saveAttendance}
                  disabled={savingAttendance}
                >
                  {savingAttendance ? (
                    <>
                      <div className="mr-2 h-5 w-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Save Attendance
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No students enrolled in this class.
            </div>
          )}
        </div>
      )}
      
      {/* Attendance records - show in both tabs but with different styling */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {activeTab === 'mark' ? 'Recent Attendance Records' : 'Attendance Records'}
          </h3>
          {activeTab === 'view' && attendanceRecords.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Showing {attendanceRecords.length} attendance records
            </p>
          )}
        </div>
        
        {/* Desktop view */}
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
              {attendanceRecords.length > 0 ? (
                attendanceRecords.map((record) => {
                  const presentCount = record.attendance.filter(a => a.present).length;
                  const absentCount = record.attendance.length - presentCount;
                  
                  return (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(record.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {classes.find(c => c.classId === record.classId)?.name || record.classId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-1" />
                          {presentCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <XCircleIcon className="h-5 w-5 text-red-500 mr-1" />
                          {absentCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
                          onClick={() => {
                            const classObj = classes.find(c => c.classId === record.classId);
                            if (classObj) {
                              setSelectedClass(classObj);
                              setSelectedDate(new Date(record.date).toISOString().split('T')[0]);
                              setActiveTab('mark'); // Switch to mark tab to see details
                              triggerVibration();
                            }
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Mobile view - cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {attendanceRecords.length > 0 ? (
            attendanceRecords.map((record) => {
              const presentCount = record.attendance.filter(a => a.present).length;
              const absentCount = record.attendance.length - presentCount;
              
              return (
                <div key={record._id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {classes.find(c => c.classId === record.classId)?.name || record.classId}
                      </h4>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {formatDate(record.date)}
                      </div>
                    </div>
                    <button
                      className="p-2 rounded-full hover:bg-indigo-50 text-indigo-600"
                      onClick={() => {
                        const classObj = classes.find(c => c.classId === record.classId);
                        if (classObj) {
                          setSelectedClass(classObj);
                          setSelectedDate(new Date(record.date).toISOString().split('T')[0]);
                          setActiveTab('mark'); // Switch to mark tab
                          triggerVibration();
                        }
                      }}
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center space-x-6">
                    <div className="flex items-center text-sm">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600 mr-2">
                        <CheckCircleIcon className="h-4 w-4" />
                      </div>
                      <span>{presentCount} present</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 mr-2">
                        <XCircleIcon className="h-4 w-4" />
                      </div>
                      <span>{absentCount} absent</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-gray-500">
              No attendance records found.
            </div>
          )}
        </div>
      </div>
      
      {/* Quick action button for mobile */}
      {activeTab === 'mark' && selectedClass && (
        <div className="fixed bottom-20 right-4 md:hidden">
          <button
            className="bg-indigo-600 text-white h-14 w-14 rounded-full shadow-lg flex items-center justify-center active:bg-indigo-700"
            aria-label="Save attendance"
            onClick={saveAttendance}
            disabled={savingAttendance}
          >
            {savingAttendance ? (
              <div className="h-6 w-6 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
            ) : (
              <CheckIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}