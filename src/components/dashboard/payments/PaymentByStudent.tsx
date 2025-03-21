'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PaymentForm } from './PaymentForm';
import { XMarkIcon, CheckCircleIcon, MagnifyingGlassIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import debounce from 'lodash/debounce';

interface Student {
  _id: string;
  sid: string;
  name: string;
  email: string;
  grade?: number;
  contactNumber: string;
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
  status: string;
  startDate: string;
}

interface Payment {
  _id: string;
  student: {
    sid: string;
    name: string;
  };
  class: {
    classId: string;
    name: string;
  };
  academicYear: number;
  month: number;
  amount: number;
  dueDate: string;
  status: string;
  paymentMethod: string;
  paidDate?: string;
}

interface PaymentByStudentProps {
  onPaymentSuccess: (message: string) => void;
}

export function PaymentByStudent({ onPaymentSuccess }: PaymentByStudentProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [studentPayments, setStudentPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [currentPaymentData, setCurrentPaymentData] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [loadingPaymentAction, setLoadingPaymentAction] = useState<string | null>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState<boolean>(false);
  
  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const limit = 10;

  // Fetch students with pagination
  useEffect(() => {
    fetchCurrentPageStudents();
  }, [page]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) {
        fetchCurrentPageStudents();
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/student?page=1&limit=50`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to search students');
        }
        
        // Filter students client-side by name or student ID
        const filteredStudents = data.students.filter((student: Student) => 
          student.name.toLowerCase().includes(term.toLowerCase()) || 
          student.sid.includes(term)
        );
        
        setStudents(filteredStudents);
        setTotalPages(1); // Reset pagination for search results
        setTotalStudents(filteredStudents.length);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  // Effect to trigger debounced search when search term changes
  useEffect(() => {
    debouncedSearch(searchTerm);
    // Cancel the debounced search on cleanup
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  const fetchCurrentPageStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/student?page=${page}&limit=${limit}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch students');
      }
      
      setStudents(data.students);
      setTotalPages(data.pagination.pages);
      setTotalStudents(data.pagination.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle student selection
  const selectStudent = async (student: Student) => {
    setSelectedStudent(student);
    await fetchStudentPaymentData(student.sid);
  };

  // Get all required payment data for a student
  const fetchStudentPaymentData = async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get enrollments for the student
      const enrollmentResponse = await fetch(`/api/enrollment?studentId=${studentId}`);
      const enrollmentData = await enrollmentResponse.json();
      
      if (!enrollmentResponse.ok) {
        throw new Error(enrollmentData.error || 'Failed to fetch enrollments');
      }
      
      const enrollments = enrollmentData.enrollments;
      setStudentEnrollments(enrollments);
      
      // Get existing payments for the student
      const paymentResponse = await fetch(`/api/payment?studentId=${studentId}`);
      const paymentData = await paymentResponse.json();
      
      if (!paymentResponse.ok) {
        throw new Error(paymentData.error || 'Failed to fetch payments');
      }
      
      setStudentPayments(paymentData.payments);
      
      // Calculate pending payments based on enrollments and existing payments
      const missingPayments = calculateMissingPayments(enrollments, paymentData.payments);
      setPendingPayments(missingPayments);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate which payments are missing for enrolled classes
  const calculateMissingPayments = (enrollments: Enrollment[], existingPayments: Payment[]) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    const missingPayments: any[] = [];
    
    // Check each enrollment to see if payments are up to date
    enrollments.forEach(enrollment => {
      if (enrollment.status !== 'ACTIVE') return;
      
      // Check for current month payments (include PENDING ones as needing action)
      const currentMonthPayment = existingPayments.find(payment => 
        payment.class.classId === enrollment.class.classId &&
        payment.academicYear === currentYear &&
        payment.month === currentMonth &&
        payment.status !== 'WAIVED'
      );
      
      // Add to missing payments if not found or if it's in PENDING status
      if (!currentMonthPayment || currentMonthPayment.status === 'PENDING') {
        missingPayments.push({
          studentId: enrollment.student.sid,
          studentName: enrollment.student.name,
          classId: enrollment.class.classId,
          className: enrollment.class.name,
          year: currentYear,
          month: currentMonth,
          monthName: getMonthName(currentMonth),
          type: 'current',
          _id: currentMonthPayment?._id, // Include the payment ID if it exists
          amount: currentMonthPayment?.amount, // Include the amount if it exists
          status: currentMonthPayment?.status || 'MISSING' // Include the status if it exists
        });
      }
      
      // Check for any previous months with pending or missing payments (up to 3 months back)
      for (let i = 1; i <= 3; i++) {
        let checkMonth = currentMonth - i;
        let checkYear = currentYear;
        
        // Handle year boundary
        if (checkMonth <= 0) {
          checkMonth = 12 + checkMonth;
          checkYear -= 1;
        }
        
        // Check if payment exists for this month
        const pastPayment = existingPayments.find(payment =>
          payment.class.classId === enrollment.class.classId &&
          payment.academicYear === checkYear &&
          payment.month === checkMonth &&
          payment.status !== 'WAIVED'
        );
        
        // Add to missing payments if not found or if it's in PENDING status
        if (!pastPayment || pastPayment.status === 'PENDING') {
          missingPayments.push({
            studentId: enrollment.student.sid,
            studentName: enrollment.student.name,
            classId: enrollment.class.classId,
            className: enrollment.class.name,
            year: checkYear,
            month: checkMonth,
            monthName: getMonthName(checkMonth),
            type: 'past',
            _id: pastPayment?._id, // Include the payment ID if it exists
            amount: pastPayment?.amount, // Include the amount if it exists
            status: pastPayment?.status || 'MISSING' // Include the status if it exists
          });
        }
      }
    });
    
    return missingPayments;
  };

  const getMonthName = (month: number) => {
    const monthNames = [
      'January', 'February', 'March', 'April',
      'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1];
  };

  // Process a payment
  const handleProcessPayment = (paymentData: any) => {
    setCurrentPaymentData(paymentData);
    setShowPaymentModal(true);
  };

  // Mark as paid quickly without modal
  const handleMarkAsPaid = async (paymentData: any) => {
    try {
      setLoadingPaymentAction(paymentData._id || `${paymentData.classId}-${paymentData.month}-${paymentData.year}`);
      
      let paymentId = paymentData._id;
      
      // If no payment ID exists, create a new payment record first
      if (!paymentId) {
        const createResponse = await fetch('/api/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId: paymentData.studentId,
            classId: paymentData.classId,
            academicYear: paymentData.year,
            month: paymentData.month,
            notes: 'Auto-created by Mark as Paid action'
          }),
        });
        
        const createData = await createResponse.json();
        
        if (!createResponse.ok) {
          throw new Error(createData.error || 'Failed to create payment record');
        }
        
        paymentId = createData.payment._id;
      }
      
      // Update the payment to PAID status
      const response = await fetch('/api/payment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: paymentId,
          status: 'paid', // Changed to lowercase to match PaymentStatus enum
          paidDate: new Date().toISOString(),
          amount: paymentData.amount || 500, // Default amount if none provided
          paymentMethod: 'Cash', // Default payment method
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }
      
      // Refresh the student's payment data
      if (selectedStudent) {
        await fetchStudentPaymentData(selectedStudent.sid);
      }
      
      onPaymentSuccess(`Payment for ${paymentData.className} - ${paymentData.monthName} ${paymentData.year} marked as paid!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingPaymentAction(null);
    }
  };

  const handleSubmitPayment = async (formData: any) => {
    try {
      setProcessingPayment(true);
      setError(null);
      
      let paymentId = currentPaymentData._id;
      
      // If this is a new payment that doesn't exist yet
      if (!paymentId) {
        const createResponse = await fetch('/api/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student: {
              sid: currentPaymentData.studentId,
              name: currentPaymentData.studentName,
            },
            class: {
              classId: currentPaymentData.classId,
              name: currentPaymentData.className,
            },
            academicYear: currentPaymentData.year,
            month: currentPaymentData.month,
            status: 'PENDING',
            amount: formData.amount,
          }),
        });
        
        const createData = await createResponse.json();
        
        if (!createResponse.ok) {
          throw new Error(createData.error || 'Failed to create payment record');
        }
        
        paymentId = createData.payment._id;
      }
      
      // Update to PAID status
      const response = await fetch('/api/payment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: paymentId,
          status: 'PAID',
          paidDate: new Date(),
          amount: formData.amount,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }
      
      // Close modal and update state
      setShowPaymentModal(false);
      setCurrentPaymentData(null);
      
      // Refresh the student's payment data
      if (selectedStudent) {
        await fetchStudentPaymentData(selectedStudent.sid);
      }
      
      onPaymentSuccess(`Payment for ${currentPaymentData.className} - ${currentPaymentData.monthName} ${currentPaymentData.year} processed successfully!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setCurrentPaymentData(null);
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or student ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
          <ExclamationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Student list with pagination */}
      <div className="bg-white rounded-md shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Student List</h2>
          <p className="text-sm text-gray-600">Select a student to process payments</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.length > 0 ? (
                students.map((student) => (
                  <tr 
                    key={student._id} 
                    className={`hover:bg-gray-50 ${selectedStudent?.sid === student.sid ? 'bg-blue-50' : ''}`}
                    onClick={() => selectStudent(student)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.sid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.grade || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.contactNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectStudent(student);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    {loading ? 'Loading students...' : 'No students found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Showing page {page} of {totalPages} ({totalStudents} students)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
              className={`px-3 py-1 rounded-md ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || loading}
              className={`px-3 py-1 rounded-md ${page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Student payment details */}
      {selectedStudent && (
        <div className="bg-white rounded-md shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{selectedStudent.name} (ID: {selectedStudent.sid})</h2>
              <p className="text-sm text-gray-600">Pending Payments</p>
            </div>
            <button
              onClick={() => setSelectedStudent(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="px-6 py-4">
            <h3 className="text-md font-semibold text-gray-800 mb-3">Pending Payments</h3>
            {loading ? (
              <p className="text-sm text-gray-500">Loading payment information...</p>
            ) : (
              <>
                {(() => {
                  // Extract pending payments from studentPayments
                  const pendingFromHistory = studentPayments
                    .filter(payment => payment.status == 'pending')
                    .map(payment => ({
                      _id: payment._id,
                      studentId: payment.student.sid,
                      studentName: payment.student.name,
                      classId: payment.class.classId,
                      className: payment.class.name,
                      year: payment.academicYear,
                      month: payment.month,
                      monthName: getMonthName(payment.month),
                      amount: payment.amount,
                      status: 'PENDING',
                      type: payment.month === new Date().getMonth() + 1 ? 'current' : 'past',
                    }));

                  // Combine with pendingPayments and avoid duplicates
                  const allPendingPayments = [...pendingFromHistory];
                  pendingPayments.forEach(payment => {
                    const isDuplicate = allPendingPayments.some(
                      p =>
                        p._id === payment._id ||
                        (p.classId === payment.classId &&
                          p.year === payment.year &&
                          p.month === payment.month)
                    );
                    if (!isDuplicate) {
                      allPendingPayments.push(payment);
                    }
                  });

                  // Debugging output
                  console.log('Pending Payments:', allPendingPayments);

                  return allPendingPayments.length > 0 ? (
                    <div className="space-y-4 mb-6">
                      {allPendingPayments.map((payment, index) => (
                        <div
                          key={index}
                          className={`p-4 border rounded-md ${
                            payment.status === 'PENDING'
                              ? 'border-yellow-200 bg-yellow-50'
                              : payment.type === 'current'
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                            <div>
                              <h4 className="font-medium text-gray-800">{payment.className}</h4>
                              <div className="flex items-center mt-1">
                                <p className="text-sm text-gray-600">
                                  {payment.monthName} {payment.year}
                                </p>
                                {payment.status === 'PENDING' && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Pending
                                  </span>
                                )}
                                {payment.type === 'past' && payment.status !== 'PENDING' && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    Overdue
                                  </span>
                                )}
                              </div>
                              {payment.amount > 0 && (
                                <p className="text-sm font-medium mt-1 text-gray-700">
                                  Amount: ${payment.amount.toFixed(2)}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleMarkAsPaid(payment)}
                                disabled={
                                  loadingPaymentAction ===
                                  (payment._id || `${payment.classId}-${payment.month}-${payment.year}`)
                                }
                                className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                              >
                                {loadingPaymentAction ===
                                (payment._id || `${payment.classId}-${payment.month}-${payment.year}`) ? (
                                  <span className="inline-block animate-spin mr-1">⏳</span>
                                ) : (
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                )}
                                Mark as Paid
                              </button>
                              <button
                                onClick={() => handleProcessPayment(payment)}
                                className="px-3 py-1.5 border border-blue-500 text-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic mb-6">No pending payments found</p>
                  );
                })()}
              </>
            )}
            
            {/* Button to toggle payment history visibility */}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center space-x-1"
              >
                <span>{showPaymentHistory ? 'Hide' : 'View'} Payment History</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showPaymentHistory ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {/* Payment History (conditionally visible) */}
            {showPaymentHistory && (
              <>
                <h3 className="text-md font-semibold text-gray-800 mt-6 mb-3">Payment History</h3>
                {studentPayments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {studentPayments.map((payment) => (
                          <tr key={payment._id}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{payment.class.name}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {getMonthName(payment.month)} {payment.academicYear}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              ${payment.amount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              <span 
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  payment.status === 'PAID' 
                                    ? 'bg-green-100 text-green-800' 
                                    : payment.status === 'WAIVED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No payment history found</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && currentPaymentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Process Payment</h2>
              <button onClick={closePaymentModal} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-gray-700">Student: <span className="font-medium">{currentPaymentData.studentName}</span></p>
              <p className="text-sm text-gray-700">Class: <span className="font-medium">{currentPaymentData.className}</span></p>
              <p className="text-sm text-gray-700">Period: <span className="font-medium">{currentPaymentData.monthName} {currentPaymentData.year}</span></p>
              {currentPaymentData.status === 'PENDING' && (
                <p className="text-sm text-yellow-700 mt-1">This payment is currently pending.</p>
              )}
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = {
                amount: parseFloat((e.target as any).amount.value),
                paymentMethod: (e.target as any).paymentMethod.value,
                notes: (e.target as any).notes.value,
              };
              handleSubmitPayment(formData);
            }} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  step="0.01"
                  defaultValue={currentPaymentData.amount || ""}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {processingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}