import React, { useState, useEffect } from 'react';
import { XMarkIcon, CreditCardIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Student {
  _id: string;
  name: string;
  sid: string;
  email: string;
  contactNumber: string;
  paymentMethod?: 'Cash' | 'Invoice';
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

interface ClassDetails {
  _id: string;
  classId: string;
  name: string;
  monthlyFee: number;
}

interface StudentPaymentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const StudentPaymentModal: React.FC<StudentPaymentModalProps> = ({ 
  student, 
  isOpen, 
  onClose,
  onSuccess
}) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classDetails, setClassDetails] = useState<{[key: string]: ClassDetails}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMonth, setPaymentMonth] = useState<number>(new Date().getMonth() + 1);
  const [paymentYear, setPaymentYear] = useState<number>(new Date().getFullYear());
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Invoice'>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Helper function for haptic feedback
  const triggerVibration = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // Fetch student enrollments when the modal opens
  useEffect(() => {
    if (isOpen && student) {
      fetchStudentEnrollments();
    } else {
      // Reset state when modal closes
      setSelectedClassId('');
      setPaymentAmount(0);
      setNotes('');
      setShowSuccess(false);
    }
  }, [isOpen, student]);

  // Update payment amount when class is selected
  useEffect(() => {
    if (selectedClassId && classDetails[selectedClassId]) {
      setPaymentAmount(classDetails[selectedClassId].monthlyFee);
    }
  }, [selectedClassId, classDetails]);

  const fetchStudentEnrollments = async () => {
    if (!student) return;

    try {
      setLoading(true);
      setError('');
      
      // SOLUTION: Fetch ALL enrollments first, then filter client-side
      const enrollmentResponse = await fetch(`/api/enrollment?studentId=${student.sid}`);
      
      if (!enrollmentResponse.ok) {
        const errorData = await enrollmentResponse.json();
        throw new Error(errorData.error || 'Failed to fetch student enrollments');
      }
      
      const enrollmentData = await enrollmentResponse.json();
      console.log('All enrollment data:', enrollmentData); // Debug log
      
      // Filter active enrollments client-side to handle case differences
      const activeEnrollments = enrollmentData.enrollments.filter((e: Enrollment) => 
        e.status.toLowerCase() === 'active' || e.status === 'ACTIVE'
      );
      
      console.log('Filtered active enrollments:', activeEnrollments); // Debug log
      setEnrollments(activeEnrollments);
      
      // Continue with the rest of the function...
      const classIds = activeEnrollments.map((e: Enrollment) => e.class.classId);
      
      if (classIds.length > 0) {
        const classesData: {[key: string]: ClassDetails} = {};
        
        // Fetch each class detail
        await Promise.all(classIds.map(async (classId: string) => {
          const classResponse = await fetch(`/api/class?classId=${classId}`);
          
          if (classResponse.ok) {
            const classData = await classResponse.json();
            console.log('Class data for', classId, ':', classData); // Debug log
            if (classData.class) {
              classesData[classId] = classData.class;
            } else if (classData) {
              // Handle API inconsistency - sometimes it returns the class directly
              classesData[classId] = classData;
            }
          }
        }));
        
        setClassDetails(classesData);
        console.log('Class details:', classesData); // Debug log
        
        // Set first class as default if available
        if (classIds.length > 0 && !selectedClassId) {
          setSelectedClassId(classIds[0]);
        }
      } else {
        console.log('No active classes found for this student'); // Debug log
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  // Add this function to handle a "Mark as Paid" action for an existing payment
  const handleMarkAsPaid = async (classId: string) => {
    if (!student || !classId) return;
    
    try {
      setProcessing(true);
      setError('');
      triggerVibration();
      
      // First create a payment record
      const createPaymentResponse = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.sid,
          classId: classId,
          academicYear: paymentYear,
          month: paymentMonth,
          notes: 'Automatically created payment record'
        }),
      });
      
      const createResult = await createPaymentResponse.json();
      
      // Handle the case where a payment already exists
      const paymentId = createPaymentResponse.ok ? 
        createResult.payment._id : 
        (createResult.payment?._id || null);
      
      if (!paymentId) {
        throw new Error('Failed to create or find payment record');
      }
      
      // Now mark it as paid
      const updateResponse = await fetch('/api/payment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: paymentId,
          status: 'paid',
          amount: paymentAmount,
          paymentMethod,
          notes,
          paidDate: new Date().toISOString()
        }),
      });
      
      const updateResult = await updateResponse.json();
      
      if (!updateResponse.ok) {
        throw new Error(updateResult.error || 'Failed to update payment status');
      }
      
      // Show success animation
      setShowSuccess(true);
      
      // After a brief delay, close the modal and notify parent
      setTimeout(() => {
        onSuccess(`Successfully processed payment of £${paymentAmount} for ${student.name}`);
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
      setProcessing(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!student || !selectedClassId) return;
    
    try {
      setProcessing(true);
      setError('');
      triggerVibration();
      
      // First, create the payment record
      const createResponse = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.sid,
          classId: selectedClassId,
          academicYear: paymentYear,
          month: paymentMonth,
          notes
        }),
      });
      
      const createData = await createResponse.json();
      
      // If the payment already exists or was created successfully, mark it as paid
      let paymentId;
      
      if (createResponse.ok) {
        paymentId = createData.payment._id;
      } else if (createData.payment && createData.payment._id) {
        // Handle case where payment exists but we got a 409 conflict
        paymentId = createData.payment._id;
      } else {
        throw new Error(createData.error || 'Failed to create payment record');
      }
      
      // Now mark it as paid with the amount specified
      const updateResponse = await fetch('/api/payment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: paymentId,
          status: 'paid',
          amount: paymentAmount,
          paymentMethod,
          notes,
          paidDate: new Date().toISOString()
        }),
      });
      
      const updateData = await updateResponse.json();
      
      if (!updateResponse.ok) {
        throw new Error(updateData.error || 'Failed to process payment');
      }
      
      // Show success animation
      setShowSuccess(true);
      
      // After a brief delay, close the modal and notify parent
      setTimeout(() => {
        onSuccess(`Successfully processed payment of £${paymentAmount} for ${student.name}`);
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Payment submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
      setProcessing(false);
    }
  };

  if (!isOpen || !student) return null;

  // If showing success animation
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 text-center animate-success-appear">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-green-600 animate-success-check"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-600">
            Payment of £{paymentAmount} has been recorded for {student.name}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Process Payment</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-3 sm:p-4">
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold mr-3">
                {student.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium">{student.name}</p>
                <p className="text-sm text-gray-600">ID: {student.sid}</p>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
              {error}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-6">
              <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-700">This student is not currently enrolled in any classes.</p>
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-sm text-gray-500">Try these options:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Try fetching without status filter
                      fetch(`/api/enrollment?studentId=${student.sid}`)
                        .then(res => res.json())
                        .then(data => {
                          console.log('All enrollments:', data);
                          alert(`Found ${data.enrollments?.length || 0} enrollments (any status)`);
                        });
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                  >
                    Check All Enrollments
                  </button>
                  <button
                    onClick={onClose}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitPayment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a class</option>
                    {enrollments.map((enrollment) => (
                      <option key={enrollment._id} value={enrollment.class.classId}>
                        {enrollment.class.name} - £{classDetails[enrollment.class.classId]?.monthlyFee || 0}/month
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Month
                    </label>
                    <select
                      value={paymentMonth}
                      onChange={(e) => setPaymentMonth(Number(e.target.value))}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {[
                        { value: 1, name: 'January' },
                        { value: 2, name: 'February' },
                        { value: 3, name: 'March' },
                        { value: 4, name: 'April' },
                        { value: 5, name: 'May' },
                        { value: 6, name: 'June' },
                        { value: 7, name: 'July' },
                        { value: 8, name: 'August' },
                        { value: 9, name: 'September' },
                        { value: 10, name: 'October' },
                        { value: 11, name: 'November' },
                        { value: 12, name: 'December' },
                      ].map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <select
                      value={paymentYear}
                      onChange={(e) => setPaymentYear(Number(e.target.value))}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {[
                        new Date().getFullYear() - 1,
                        new Date().getFullYear(),
                        new Date().getFullYear() + 1
                      ].map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (£)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">£</span>
                    </div>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="block w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Invoice')}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Invoice">Invoice</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Add any additional notes here"
                  ></textarea>
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end mt-6 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto min-h-[40px] py-2 px-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing || !selectedClassId}
                    className="w-full sm:w-auto min-h-[40px] py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></div>
                        <span className="truncate">Processing...</span>
                      </>
                    ) : (
                      <>
                        <CreditCardIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">Pay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPaymentModal;