'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircleIcon, ClockIcon, MagnifyingGlassIcon, XMarkIcon, AdjustmentsHorizontalIcon, ChevronDownIcon, ChevronUpIcon, CalendarIcon } from '@heroicons/react/24/solid';
import { useSwipeable } from 'react-swipeable';

interface Class {
  _id: string;
  classId: string;
  name: string;
  grade: number;
  subject: string;
  monthlyFee: number;
  centerId: number;
  schedule: {
    days: string[];
    time: string;
  };
}

interface Student {
  _id: string;
  sid: string;
  name: string;
  email: string;
  paymentMethod: string;
}

interface Enrollment {
  _id: string;
  student: {
    sid: string;
    name: string;
  };
  class: {
    classId: string;
    name: string;
  };
  enrollmentDate: string; // Changed from startDate to match your schema
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentStatus {
  studentId: string;
  paid: boolean;
  paymentId?: string;
  amount?: number;
  proratedAmount?: number; // Added field for prorated amount
  paidDate?: string;
  partialPayments?: {
    amount: number;
    date: string;
    paymentId: string;
  }[];
  remainingBalance?: number;
  isProrated?: boolean; // Flag to indicate if amount is prorated
  enrollmentDate?: string; // Store enrollment date
}

interface PaymentByClassProps {
  onPaymentSuccess: (message: string) => void;
}

export function PaymentByClass({ onPaymentSuccess }: PaymentByClassProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Enrollment[]>([]);
  const [studentDetails, setStudentDetails] = useState<{[key: string]: Student}>({});
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{[key: string]: PaymentStatus}>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // New state for partial payments
  const [showPartialPaymentModal, setShowPartialPaymentModal] = useState<boolean>(false);
  const [partialPaymentStudent, setPartialPaymentStudent] = useState<any>(null);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<string>('');
  const [partialPaymentError, setPartialPaymentError] = useState<string | null>(null);
  
  // New filter state variables
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [availableGrades, setAvailableGrades] = useState<number[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  
  // Refs for scroll handling
  const classListRef = useRef<HTMLDivElement>(null);
  const studentListRef = useRef<HTMLDivElement>(null);

  // New state variables for month/year selection and payment history
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);
  const [paymentHistory, setPaymentHistory] = useState<{[key: string]: any[]}>({});
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

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
    
    try {
      await fetchClasses();
      if (selectedClass) {
        await fetchEnrolledStudents(selectedClass.classId);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Swipe handlers for pull-to-refresh
  interface SwipeEventData {
    initial: [number, number];
    deltaX: number;
    deltaY: number;
    velocity: number;
    dir: string;
    absX: number;
    absY: number;
  }

  const swipeHandlers = useSwipeable({
    onSwipedDown: (eventData: SwipeEventData) => {
      if (eventData.initial[1] < 60) {
        handleRefresh();
      }
    },
    delta: 50,
    preventScrollOnSwipe: false,
    trackMouse: false
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchEnrolledStudents(selectedClass.classId);
      // Scroll to student list on mobile
      setTimeout(() => {
        if (studentListRef.current) {
          studentListRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    } else {
      setEnrolledStudents([]);
      setPaymentStatus({});
      setStudentDetails({});
    }
  }, [selectedClass, selectedMonth, selectedYear]); // Add month and year as dependencies

  // Extract unique grades and subjects when classes are loaded
  useEffect(() => {
    if (classes.length > 0) {
      // Extract and sort unique grades
      const grades = Array.from(new Set(classes.map(cls => cls.grade))).sort((a, b) => a - b);
      setAvailableGrades(grades);
      
      // Extract and sort unique subjects
      const subjects = Array.from(new Set(classes.map(cls => cls.subject))).sort();
      setAvailableSubjects(subjects);
    }
  }, [classes]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/class');
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }
      const data = await response.json();
      
      // Sort classes by today's schedule
      const sortedClasses = sortClassesByTodaySchedule(data);
      setClasses(sortedClasses);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch classes');
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setGradeFilter(null);
    setSubjectFilter(null);
    triggerVibration();
  };

  // Toggle filters visibility (for mobile)
  const toggleFilters = () => {
    setShowFilters(!showFilters);
    triggerVibration();
  };

  const sortClassesByTodaySchedule = (classes: Class[]) => {
    const today = new Date().toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Helper function to calculate time difference
    const getTimeDifference = (timeString: string) => {
      if (!timeString) return Infinity;
      
      const [hours, minutes] = timeString.split(':').map(Number);
      const classTimeInMinutes = hours * 60 + minutes;
      const currentTimeInMinutes = currentHours * 60 + currentMinutes;
      
      return Math.abs(classTimeInMinutes - currentTimeInMinutes);
    };
    
    return [...classes].sort((a, b) => {
      const aIsToday = a.schedule?.days?.some(day => day.toLowerCase().includes(today));
      const bIsToday = b.schedule?.days?.some(day => day.toLowerCase().includes(today));
      
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      
      if (aIsToday && bIsToday) {
        return getTimeDifference(a.schedule?.time) - getTimeDifference(b.schedule?.time);
      }
      
      return a.name.localeCompare(b.name);
    });
  };

  const fetchEnrolledStudents = async (classId: string) => {
    try {
      setLoadingStudents(true);
      setError(null);
      
      // Fetch all active enrollments for the class
      const response = await fetch(`/api/enrollment?classId=${classId}&status=active`);
      if (!response.ok) {
        throw new Error('Failed to fetch enrolled students');
      }
      
      const data = await response.json();
      const allEnrollments = data.enrollments || [];
      
      // Filter enrollments based on enrollment date
      // Only include students enrolled on or before the end of the selected month/year
      const endOfSelectedMonth = new Date(selectedYear, selectedMonth, 0); // Last day of selected month
      
      const filteredEnrollments = allEnrollments.filter((enrollment: Enrollment) => {
        const enrollmentDate = new Date(enrollment.enrollmentDate);
        return enrollmentDate <= endOfSelectedMonth;
      });
      
      setEnrolledStudents(filteredEnrollments);
      
      // Fetch payment status for these students
      if (filteredEnrollments.length > 0) {
        await fetchStudentDetails(filteredEnrollments);
        await fetchPaymentStatus(filteredEnrollments, classId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch enrolled students');
      console.error('Error fetching enrolled students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };
  
  const fetchStudentDetails = async (enrollments: Enrollment[]) => {
    try {
      // Get unique student IDs
      const studentIds = [...new Set(enrollments.map(e => e.student.sid))];
      const details: {[key: string]: Student} = {};
      
      // Fetch details for each student
      await Promise.all(studentIds.map(async (sid) => {
        const response = await fetch(`/api/student?sid=${sid}`);
        if (response.ok) {
          const data = await response.json();
          if (data.students && data.students[0]) {
            details[sid] = data.students[0];
          }
        }
      }));
      
      setStudentDetails(details);
    } catch (err: any) {
      console.error('Error fetching student details:', err);
    }
  };

  const fetchPaymentStatus = async (students: Enrollment[], classId: string) => {
    try {
      const newPaymentStatus: {[key: string]: PaymentStatus} = {};
      
      // Check payment status for each student with selected month/year
      await Promise.all(students.map(async (enrollment) => {
        try {
          const response = await fetch(
            `/api/payment?studentId=${enrollment.student.sid}&classId=${classId}&year=${selectedYear}&month=${selectedMonth}`
          );
          
          if (response.ok) {
            const data = await response.json();
            const payments = data.payments || [];
            
            if (payments.length > 0) {
              const latestPayment = payments[0];
              
              // Check if we have partial payments
              const partialPayments = payments
                .filter((p: any) => p.status === 'partial' || (p.notes && p.notes.includes('Partial payment')))
                .map((p: any) => ({
                  amount: p.amount || 0,
                  date: p.paidDate || p.updatedAt,
                  paymentId: p._id
                }));
              
              // Calculate total amount paid
              const totalPaid = partialPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
              const remainingBalance = selectedClass?.monthlyFee ? (selectedClass.monthlyFee - totalPaid) : 0;
              
              // Check if this is a prorated amount
              const isProrated = latestPayment.amount !== selectedClass?.monthlyFee;
              
              newPaymentStatus[enrollment.student.sid] = {
                studentId: enrollment.student.sid,
                paid: latestPayment.status === 'paid' || remainingBalance <= 0,
                paymentId: latestPayment._id,
                amount: latestPayment.amount,
                proratedAmount: isProrated ? latestPayment.amount : undefined,
                paidDate: latestPayment.paidDate,
                partialPayments: partialPayments.length > 0 ? partialPayments : undefined,
                remainingBalance: partialPayments.length > 0 ? remainingBalance : undefined,
                isProrated: isProrated,
                enrollmentDate: enrollment.enrollmentDate
              };
            } else {
              // No payment record exists yet
              // Calculate what the prorated amount would be if enrolled mid-month
              const enrollmentDate = new Date(enrollment.enrollmentDate);
              const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
              const monthEnd = new Date(selectedYear, selectedMonth, 0);
              const isProrated = enrollmentDate > monthStart && enrollmentDate <= monthEnd;
              
              newPaymentStatus[enrollment.student.sid] = {
                studentId: enrollment.student.sid,
                paid: false,
                isProrated: isProrated,
                enrollmentDate: enrollment.enrollmentDate
              };
            }
          }
        } catch (err) {
          console.error(`Error checking payment for student ${enrollment.student.sid}:`, err);
        }
      }));
      
      setPaymentStatus(newPaymentStatus);
    } catch (err: any) {
      console.error('Error fetching payment status:', err);
    }
  };

  const fetchPaymentHistory = async (students: Enrollment[], classId: string) => {
    if (!selectedClass || loadingHistory) return;
    
    setLoadingHistory(true);
    const history: {[key: string]: any[]} = {};
    
    try {
      // Get history for past 6 months
      const currentDate = new Date();
      
      await Promise.all(students.map(async (enrollment) => {
        const sid = enrollment.student.sid;
        history[sid] = [];
        
        // Fix: Use enrollmentDate instead of startDate 
        let enrollmentDate: Date;
        if (enrollment.enrollmentDate) {
          // Correctly access the enrollmentDate field
          enrollmentDate = new Date(enrollment.enrollmentDate);
          
          // Set time to midnight to ensure proper date comparison
          enrollmentDate.setHours(0, 0, 0, 0);
          
          if (isNaN(enrollmentDate.getTime())) {
            console.warn(`Invalid enrollment date for student ${sid}, using fallback`);
            enrollmentDate = new Date();
            enrollmentDate.setMonth(enrollmentDate.getMonth() - 6);
          }
        } else {
          console.warn(`No enrollment date for student ${sid}, using fallback`);
          enrollmentDate = new Date();
          enrollmentDate.setMonth(enrollmentDate.getMonth() - 6);
        }
        
        console.log(`Student ${sid} enrolled on: ${enrollmentDate.toISOString()}`);
        
        // Fetch last 6 months of payment data
        for (let i = 0; i < 6; i++) {
          const date = new Date();
          date.setMonth(currentDate.getMonth() - i);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();
          
          // Skip current selection
          if (month === selectedMonth && year === selectedYear) continue;
          
          // Create date for first day of the month we're checking
          const historyMonthStart = new Date(year, month - 1, 1);
          historyMonthStart.setHours(0, 0, 0, 0);
          
          // Skip if this month is before enrollment
          if (historyMonthStart < enrollmentDate) {
            console.log(`Skipping ${months[month-1]} ${year} - before enrollment (${enrollmentDate.toISOString()})`);
            continue;
          }
          
          // Rest of your code for fetching payment history...
        }
      }));
      
      setPaymentHistory(history);
    } catch (err) {
      console.error('Error fetching payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClassSelect = (classObj: Class) => {
    triggerVibration();
    setSelectedClass(selectedClass?._id === classObj._id ? null : classObj);
  };
  
  const handleMarkAsPaid = async (student: any, classObj: Class) => {
    const paymentIdentifier = `${student.student.sid}-${classObj.classId}`;
    try {
      setProcessingPayment(paymentIdentifier);
      triggerVibration();
      setError(null);
      
      // First check if payment record exists
      const checkResponse = await fetch(`/api/payment?studentId=${student.student.sid}&classId=${classObj.classId}&year=${selectedYear}&month=${selectedMonth}`);
      const checkData = await checkResponse.json();
      
      let paymentId: string;
      
      // Create payment if it doesn't exist
      if (!checkData.payments || checkData.payments.length === 0) {
        const createResponse = await fetch('/api/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId: student.student.sid,
            classId: classObj.classId,
            academicYear: selectedYear,
            month: selectedMonth,
            useSimpleProration: true, // Use simple proration for better user understanding
            notes: 'Created by class payment page'
          }),
        });
        
        const createData = await createResponse.json();
        
        if (!createResponse.ok) {
          throw new Error(createData.error || 'Failed to create payment record');
        }
        
        paymentId = createData.payment._id;
        
        // Update with the prorated amount
        const proratedAmount = createData.payment.amount;
        
        // Mark as paid
        const response = await fetch('/api/payment', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            _id: paymentId,
            status: 'paid',
            paidDate: new Date().toISOString(),
            paymentMethod: studentDetails[student.student.sid]?.paymentMethod || 'Cash',
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to process payment');
        }
        
        // Update payment status locally
        setPaymentStatus(prev => ({
          ...prev,
          [student.student.sid]: {
            studentId: student.student.sid,
            paid: true,
            paymentId: paymentId,
            amount: proratedAmount,
            proratedAmount: proratedAmount !== classObj.monthlyFee ? proratedAmount : undefined,
            paidDate: new Date().toISOString(),
            isProrated: proratedAmount !== classObj.monthlyFee,
            enrollmentDate: student.enrollmentDate
          }
        }));
        
        onPaymentSuccess(`Payment of £${proratedAmount} for ${student.student.name} marked as paid!`);
      } else {
        // If payment record already exists
        paymentId = checkData.payments[0]._id;
        const existingAmount = checkData.payments[0].amount || classObj.monthlyFee;
        
        // Mark as paid
        const response = await fetch('/api/payment', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            _id: paymentId,
            status: 'paid',
            paidDate: new Date().toISOString(),
            paymentMethod: studentDetails[student.student.sid]?.paymentMethod || 'Cash',
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to process payment');
        }
        
        // Update payment status locally
        setPaymentStatus(prev => ({
          ...prev,
          [student.student.sid]: {
            studentId: student.student.sid,
            paid: true,
            paymentId: paymentId,
            amount: existingAmount,
            proratedAmount: existingAmount !== classObj.monthlyFee ? existingAmount : undefined,
            paidDate: new Date().toISOString(),
            isProrated: existingAmount !== classObj.monthlyFee,
            enrollmentDate: student.enrollmentDate
          }
        }));
        
        onPaymentSuccess(`Payment for ${student.student.name} in ${classObj.name} marked as paid!`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleUnmarkPayment = async (student: any, classObj: Class) => {
    const paymentIdentifier = `${student.student.sid}-${classObj.classId}`;
    try {
      setProcessingPayment(paymentIdentifier);
      triggerVibration();
      setError(null);
      
      // Get the payment ID from our local state
      const paymentId = paymentStatus[student.student.sid]?.paymentId;
      
      if (!paymentId) {
        throw new Error('Cannot find payment record to unmark');
      }
      
      // Update payment status to pending (not unpaid - which isn't valid)
      const response = await fetch('/api/payment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: paymentId,
          status: 'pending',  // Changed from 'unpaid' to 'pending'
          paidDate: null
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to unmark payment');
      }
      
      // Update payment status locally
      setPaymentStatus(prev => ({
        ...prev,
        [student.student.sid]: {
          ...prev[student.student.sid],
          paid: false,
          paidDate: null
        }
      }));
      
      onPaymentSuccess(`Payment for ${student.student.name} in ${classObj.name} has been unmarked!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingPayment(null);
    }
  };

  const handlePartialPayment = async () => {
    if (!partialPaymentStudent || !selectedClass) return;
    
    const amount = parseFloat(partialPaymentAmount);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      setPartialPaymentError('Please enter a valid amount');
      return;
    }
    
    // Calculate remaining balance
    const studentId = partialPaymentStudent.student.sid;
    const existingPaymentStatus = paymentStatus[studentId];
    const totalPaidSoFar = existingPaymentStatus?.partialPayments?.reduce((total, payment) => total + payment.amount, 0) || 0;
    const newTotalPaid = totalPaidSoFar + amount;
    
    // FIXED: Changed comparison from >= to > to allow exact payment of remaining balance
    if (newTotalPaid > selectedClass.monthlyFee) {
      setPartialPaymentError(`This payment would exceed the full fee amount. Maximum payment: £${(selectedClass.monthlyFee - totalPaidSoFar).toFixed(2)}`);
      return;
    }
    
    const paymentIdentifier = `${studentId}-${selectedClass.classId}`;
    
    try {
      setProcessingPayment(paymentIdentifier);
      setPartialPaymentError(null);
      
      // Check if payment record exists
      const checkResponse = await fetch(`/api/payment?studentId=${studentId}&classId=${selectedClass.classId}&year=${selectedYear}&month=${selectedMonth}`);
      const checkData = await checkResponse.json();
      
      let paymentId;
      
      // Create payment if it doesn't exist
      if (!checkData.payments || checkData.payments.length === 0) {
        const createResponse = await fetch('/api/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId: studentId,
            classId: selectedClass.classId,
            academicYear: selectedYear,
            month: selectedMonth,
            notes: 'Partial payment made'
          }),
        });
        
        const createData = await createResponse.json();
        
        if (!createResponse.ok) {
          throw new Error(createData.error || 'Failed to create payment record');
        }
        
        paymentId = createData.payment._id;
      } else {
        paymentId = checkData.payments[0]._id;
      }
      
      // Calculate if this payment completes the full amount
      const remainingBalance = selectedClass.monthlyFee - newTotalPaid;
      const isPaidInFull = remainingBalance <= 0;
      
      // FIXED: Change status to 'paid' if this payment completes the full amount
      const response = await fetch('/api/payment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: paymentId,
          // Mark as paid if full amount is reached
          status: isPaidInFull ? 'paid' : 'pending', 
          amount: selectedClass.monthlyFee, // Always store the full fee amount
          paidDate: isPaidInFull ? new Date().toISOString() : undefined,
          paymentMethod: studentDetails[studentId]?.paymentMethod || 'Cash',
          notes: isPaidInFull 
            ? `Final payment of £${amount} received. Total paid: £${selectedClass.monthlyFee.toFixed(2)}.` 
            : `Partial payment of £${amount} received. Total paid so far: £${newTotalPaid.toFixed(2)}. Remaining: £${remainingBalance.toFixed(2)}`
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process partial payment');
      }
      
      // Update payment status locally
      // Update the existing partial payments or create a new array
      const updatedPartialPayments = [
        ...(existingPaymentStatus?.partialPayments || []),
        {
          amount,
          date: new Date().toISOString(),
          paymentId
        }
      ];
      
      setPaymentStatus(prev => ({
        ...prev,
        [studentId]: {
          studentId,
          paid: isPaidInFull,
          paymentId,
          amount,
          paidDate: isPaidInFull ? new Date().toISOString() : undefined,
          partialPayments: updatedPartialPayments,
          remainingBalance
        }
      }));
      
      setShowPartialPaymentModal(false);
      setPartialPaymentAmount('');
      
      if (isPaidInFull) {
        onPaymentSuccess(`Payment completed for ${partialPaymentStudent.student.name}! Full amount of £${selectedClass.monthlyFee} received.`);
      } else {
        onPaymentSuccess(`Partial payment of £${amount} recorded for ${partialPaymentStudent.student.name}!`);
      }
    } catch (err: any) {
      setPartialPaymentError(err.message);
    } finally {
      setProcessingPayment(null);
    }
  };

  // Apply all filters to classes
  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.classId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.subject.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesGrade = gradeFilter === null || cls.grade === gradeFilter;
    const matchesSubject = subjectFilter === null || cls.subject === subjectFilter;
    
    return matchesSearch && matchesGrade && matchesSubject;
  });

  // Responsive class card for mobile view
  const ClassCard = ({ classObj }: { classObj: Class }) => (
    <div 
      className={`border rounded-lg p-4 mb-3 transition-all duration-200 ${
        selectedClass?._id === classObj._id 
          ? 'bg-blue-50 border-blue-500 shadow-md' 
          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
      }`}
      onClick={() => handleClassSelect(classObj)}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <h3 className="font-medium text-gray-900">{classObj.name}</h3>
            {selectedClass?._id === classObj._id && (
              <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{classObj.subject} (Grade {classObj.grade})</p>
        </div>
        <span className="text-sm font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
          £{classObj.monthlyFee}
        </span>
      </div>
      <div className="mt-2 text-xs text-gray-500 flex justify-between">
        <span>{classObj.schedule?.days?.join(', ')} at {classObj.schedule?.time}</span>
        <span className="text-blue-600 font-medium">ID: {classObj.classId}</span>
      </div>
    </div>
  );

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (selectedClass && enrolledStudents.length > 0) {
      fetchPaymentStatus(enrolledStudents, selectedClass.classId);
    }
  }, [selectedClass, enrolledStudents, selectedMonth, selectedYear]);

  return (
    <div className="pb-6" {...swipeHandlers}>
      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="flex justify-center items-center pb-4">
          <div className="h-6 w-6 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
      )}

      {/* Filter Toggle Button (Mobile) */}
      <div className="md:hidden mb-4">
        <button 
          onClick={toggleFilters}
          className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2 text-gray-500" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* Filter Section */}
      <div className={`mb-6 ${showFilters || window.innerWidth >= 768 ? 'block' : 'hidden'}`}>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Filter Classes</h3>
            <button 
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Reset All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Grade Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <select
                value={gradeFilter === null ? "" : gradeFilter}
                onChange={(e) => {
                  const value = e.target.value === "" ? null : parseInt(e.target.value);
                  setGradeFilter(value);
                  triggerVibration();
                }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Grades</option>
                {availableGrades.map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>
            
            {/* Subject Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                value={subjectFilter || ""}
                onChange={(e) => {
                  const value = e.target.value === "" ? null : e.target.value;
                  setSubjectFilter(value);
                  triggerVibration();
                }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Subjects</option>
                {availableSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Applied Filters Tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            {gradeFilter !== null && (
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                Grade {gradeFilter}
                <button 
                  type="button" 
                  onClick={() => setGradeFilter(null)}
                  className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-500 focus:outline-none focus:bg-gray-500 focus:text-white"
                >
                  <span className="sr-only">Remove filter</span>
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            
            {subjectFilter !== null && (
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                {subjectFilter}
                <button 
                  type="button" 
                  onClick={() => setSubjectFilter(null)}
                  className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-500 focus:outline-none focus:bg-gray-500 focus:text-white"
                >
                  <span className="sr-only">Remove filter</span>
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search for a Class
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Enter class name, ID or subject"
            className="pl-10 pr-4 py-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Results Summary */}
      {(gradeFilter !== null || subjectFilter !== null) && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'} 
          {gradeFilter !== null && ` in Grade ${gradeFilter}`}
          {subjectFilter !== null && ` for ${subjectFilter}`}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-3 text-gray-500">Loading classes...</p>
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6" ref={classListRef}>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Select a Class</h3>
          
          {/* Mobile view - improved cards */}
          <div className="md:hidden">
            {filteredClasses.map(classObj => (
              <ClassCard key={classObj._id} classObj={classObj} />
            ))}
          </div>
          
          {/* Desktop view - improved table with clickable rows */}
          <div className="hidden md:block max-h-64 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClasses.map(classObj => (
                  <tr 
                    key={classObj._id} 
                    className={`cursor-pointer transition-colors ${
                      selectedClass?._id === classObj._id 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                    onClick={() => handleClassSelect(classObj)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classObj.classId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{classObj.name}</div>
                        {selectedClass?._id === classObj._id && (
                          <span className="ml-2 flex-shrink-0 h-2 w-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classObj.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classObj.schedule?.days?.join(', ')} {classObj.schedule?.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        £{classObj.monthlyFee}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : searchTerm ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center mb-6">
          <p className="text-gray-500">No classes found matching "{searchTerm}"</p>
        </div>
      ) : null}

      {selectedClass && (
        <div 
          className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 animate-fadeIn transition-all"
          ref={studentListRef}
        >
          <div className="bg-blue-50 border-b border-blue-200 px-5 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-800">
                  {selectedClass.name} Students
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Monthly Fee: <span className="font-semibold">£{selectedClass.monthlyFee}</span> | Class ID: {selectedClass.classId}
                </p>
              </div>
              <button
                onClick={() => setSelectedClass(null)}
                className="text-blue-600 hover:text-blue-800 md:hidden"
                aria-label="Close student list"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Month and Year Selector */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {[...Array(5)].map((_, index) => {
                  const year = new Date().getFullYear() - index;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
            <button
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              {isHistoryExpanded ? (
                <>
                  <ChevronUpIcon className="h-5 w-5" />
                  Hide History
                </>
              ) : (
                <>
                  <ChevronDownIcon className="h-5 w-5" />
                  Show History
                </>
              )}
            </button>
          </div>

          {loadingStudents ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-500">Loading students...</p>
            </div>
          ) : enrolledStudents.length > 0 ? (
            <div className="p-3 md:p-6">
              {/* Split view - Paid vs Unpaid Students */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Paid Students Column */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-green-50 p-3 border-b border-green-200">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                      <h3 className="font-medium">Paid Students</h3>
                      <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {enrolledStudents.filter(s => paymentStatus[s.student.sid]?.paid).length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto">
                    {enrolledStudents.filter(s => paymentStatus[s.student.sid]?.paid).length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {enrolledStudents
                          .filter(s => paymentStatus[s.student.sid]?.paid)
                          .map(student => {
                            const studentDetail = studentDetails[student.student.sid];
                            const paymentDate = paymentStatus[student.student.sid]?.paidDate 
                              ? new Date(paymentStatus[student.student.sid].paidDate!).toLocaleDateString() 
                              : 'Unknown date';
                            
                            return (
                              <li key={student._id} className="p-3 hover:bg-green-50">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-gray-900">{student.student.name}</p>
                                    <p className="text-xs text-gray-500">ID: {student.student.sid}</p>
                                    <p className="text-xs text-gray-600 mt-1">Paid on {paymentDate}</p>
                                  </div>
                                  <button
                                    onClick={() => handleUnmarkPayment(student, selectedClass)}
                                    disabled={processingPayment === `${student.student.sid}-${selectedClass.classId}`}
                                    className="ml-2 inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                                  >
                                    {processingPayment === `${student.student.sid}-${selectedClass.classId}` ? (
                                      <div className="h-3 w-3 border-2 border-orange-500 rounded-full border-t-transparent animate-spin mr-1"></div>
                                    ) : (
                                      <XMarkIcon className="h-3 w-3 mr-1" />
                                    )}
                                    Unmark
                                  </button>
                                </div>
                              </li>
                            );
                          })
                        }
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <p>No paid students</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Unpaid Students Column */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-amber-50 p-3 border-b border-amber-200">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-amber-600 mr-2" />
                      <h3 className="font-medium">Unpaid Students</h3>
                      <span className="ml-2 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {enrolledStudents.filter(s => !paymentStatus[s.student.sid]?.paid).length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto">
                    {enrolledStudents.filter(s => !paymentStatus[s.student.sid]?.paid).length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {enrolledStudents
                          .filter(s => !paymentStatus[s.student.sid]?.paid)
                          .map(student => {
                            const studentDetail = studentDetails[student.student.sid];
                            const paymentInfo = paymentStatus[student.student.sid];
                            const enrollmentDate = paymentInfo?.enrollmentDate 
                              ? new Date(paymentInfo.enrollmentDate) 
                              : new Date(student.enrollmentDate);
                            
                            // Check if enrolled mid-month for this selected month/year
                            const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
                            const monthEnd = new Date(selectedYear, selectedMonth, 0);
                            const isMidMonthEnrollment = enrollmentDate >= monthStart && enrollmentDate <= monthEnd;
                            
                            return (
                              <li key={student._id} className="p-3 hover:bg-amber-50">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-gray-900">{student.student.name}</p>
                                    <p className="text-xs text-gray-500">ID: {student.student.sid}</p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Method: {studentDetail?.paymentMethod || 'Cash/Invoice'}
                                    </p>
                                    
                                    {/* Display mid-month enrollment info */}
                                    {isMidMonthEnrollment && (
                                      <div className="mt-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded text-xs">
                                        <span className="text-purple-700">
                                          Enrolled mid-month: {enrollmentDate.toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Show prorated amount if available */}
                                    {paymentInfo?.proratedAmount !== undefined && 
                                     paymentInfo.proratedAmount !== selectedClass?.monthlyFee && (
                                      <div className="mt-1 px-2 py-1 bg-indigo-50 border border-indigo-200 rounded text-xs">
                                        <span className="text-indigo-700 font-medium">
                                          Prorated: £{paymentInfo.proratedAmount.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {/* Display partial payment information if available */}
                                    {paymentInfo?.partialPayments && 
                                      paymentInfo.partialPayments.length > 0 && (
                                      <div className="mt-2 p-1 bg-amber-50 border border-amber-200 rounded-sm">
                                        <p className="text-xs font-medium text-amber-700">
                                          Partial payments: 
                                          <span className="font-bold ml-1">
                                            £{paymentInfo.partialPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                                          </span>
                                        </p>
                                        <p className="text-xs text-amber-700">
                                          Remaining: £{paymentInfo.remainingBalance?.toFixed(2)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleMarkAsPaid(student, selectedClass)}
                                      disabled={processingPayment === `${student.student.sid}-${selectedClass.classId}`}
                                      className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                    >
                                      {processingPayment === `${student.student.sid}-${selectedClass.classId}` ? (
                                        <div className="h-3 w-3 border-2 border-green-500 rounded-full border-t-transparent animate-spin mr-1"></div>
                                      ) : (
                                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                                      )}
                                      Mark Paid
                                    </button>
                                    <button
                                      onClick={() => {
                                        setPartialPaymentStudent(student);
                                        setShowPartialPaymentModal(true);
                                        setPartialPaymentAmount('');
                                        setPartialPaymentError(null);
                                        triggerVibration();
                                      }}
                                      className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                    >
                                      {/* Display split payment icon */}
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                                      </svg>
                                      Partial
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })
                        }
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <p>No unpaid students</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">
                {selectedMonth !== new Date().getMonth() + 1 || selectedYear !== new Date().getFullYear()
                  ? `No students were enrolled in this class during ${months[selectedMonth - 1]} ${selectedYear}.`
                  : "No students enrolled in this class."}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Partial Payment Modal */}
      {showPartialPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Partial Payment</h3>
              <button
                onClick={() => setShowPartialPaymentModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {partialPaymentStudent && selectedClass && (
              <>
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700">Student: {partialPaymentStudent.student.name}</p>
                  <p className="text-sm text-gray-500">ID: {partialPaymentStudent.student.sid}</p>
                  <p className="text-sm font-medium text-gray-700 mt-2">Class: {selectedClass?.name}</p>
                  <p className="text-sm text-gray-500">Monthly Fee: £{selectedClass?.monthlyFee}</p>
                  
                  {/* Show existing partial payments */}
                  {paymentStatus[partialPaymentStudent.student.sid]?.partialPayments && 
                    paymentStatus[partialPaymentStudent.student.sid]?.partialPayments!.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm font-medium">Previous Partial Payments:</p>
                      <ul className="mt-1 space-y-1">
                        {paymentStatus[partialPaymentStudent.student.sid]?.partialPayments!.map((payment, idx) => (
                          <li key={idx} className="text-xs">
                            <span className="font-medium">£{payment.amount.toFixed(2)}</span> on {new Date(payment.date).toLocaleDateString()}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm font-medium text-blue-800">
                        Total Paid: £{paymentStatus[partialPaymentStudent.student.sid]?.partialPayments!
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toFixed(2)}
                      </p>
                      <p className="text-sm font-medium text-blue-800">
                        Remaining: £{paymentStatus[partialPaymentStudent.student.sid]?.remainingBalance?.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mb-5">
                  <label htmlFor="partialAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (£)
                  </label>
                  <input
                    type="number"
                    id="partialAmount"
                    placeholder={`Max: £${
                      (paymentStatus[partialPaymentStudent.student.sid]?.remainingBalance || selectedClass.monthlyFee).toFixed(2)
                    }`}
                    step="0.01"
                    min="0.01"
                    max={paymentStatus[partialPaymentStudent.student.sid]?.remainingBalance || selectedClass?.monthlyFee}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={partialPaymentAmount}
                    onChange={(e) => setPartialPaymentAmount(e.target.value)}
                  />
                  {partialPaymentError && (
                    <p className="mt-1 text-xs text-red-600">{partialPaymentError}</p>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowPartialPaymentModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePartialPayment}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    disabled={processingPayment === `${partialPaymentStudent.student.sid}-${selectedClass?.classId}`}
                  >
                    {processingPayment === `${partialPaymentStudent.student.sid}-${selectedClass?.classId}` ? (
                      <div className="h-4 w-4 border-2 border-white rounded-full border-t-transparent animate-spin mx-auto"></div>
                    ) : (
                      'Submit Payment'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating action button for mobile */}
      <button 
        onClick={handleRefresh}
        className="md:hidden fixed right-4 bottom-20 bg-indigo-600 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:bg-indigo-700"
        aria-label="Refresh"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}