'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';

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
  status: string;
  startDate: string;
}

interface PaymentStatus {
  studentId: string;
  paid: boolean;
  paymentId?: string;
  amount?: number;
  paidDate?: string;
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

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchEnrolledStudents(selectedClass.classId);
    } else {
      setEnrolledStudents([]);
      setPaymentStatus({});
      setStudentDetails({});
    }
  }, [selectedClass]);

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
      
      // Change the query parameter to use lowercase 'active' to match the database
      const response = await fetch(`/api/enrollment?classId=${classId}&status=active`);
      if (!response.ok) {
        throw new Error('Failed to fetch enrolled students');
      }
      
      const data = await response.json();
      const students = data.enrollments || [];
      
      // Debug log to verify response
      console.log('Enrolled students data:', data);
      
      setEnrolledStudents(students);
      
      // Fetch payment status for these students
      if (students.length > 0) {
        await fetchStudentDetails(students);
        await fetchPaymentStatus(students, classId);
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
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-indexed
      const currentYear = currentDate.getFullYear();
      
      const newPaymentStatus: {[key: string]: PaymentStatus} = {};
      
      // Check payment status for each student
      await Promise.all(students.map(async (enrollment) => {
        try {
          const response = await fetch(
            `/api/payment?studentId=${enrollment.student.sid}&classId=${classId}&year=${currentYear}&month=${currentMonth}`
          );
          
          if (response.ok) {
            const data = await response.json();
            const payments = data.payments || [];
            
            if (payments.length > 0) {
              const latestPayment = payments[0];
              newPaymentStatus[enrollment.student.sid] = {
                studentId: enrollment.student.sid,
                paid: latestPayment.status === 'paid',
                paymentId: latestPayment._id,
                amount: latestPayment.amount,
                paidDate: latestPayment.paidDate
              };
            } else {
              newPaymentStatus[enrollment.student.sid] = {
                studentId: enrollment.student.sid,
                paid: false
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

  const handleClassSelect = (classObj: Class) => {
    setSelectedClass(selectedClass?._id === classObj._id ? null : classObj);
  };
  
  const handleMarkAsPaid = async (student: any, classObj: Class) => {
    const paymentIdentifier = `${student.student.sid}-${classObj.classId}`;
    try {
      setProcessingPayment(paymentIdentifier);
      setError(null);
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-indexed
      const currentYear = currentDate.getFullYear();
      
      // First check if payment record exists
      const checkResponse = await fetch(`/api/payment?studentId=${student.student.sid}&classId=${classObj.classId}&year=${currentYear}&month=${currentMonth}`);
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
            studentId: student.student.sid,
            classId: classObj.classId,
            academicYear: currentYear,
            month: currentMonth,
            notes: 'Created by class payment page'
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
          amount: classObj.monthlyFee,
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
          amount: classObj.monthlyFee,
          paidDate: new Date().toISOString()
        }
      }));
      
      onPaymentSuccess(`Payment for ${student.student.name} in ${classObj.name} marked as paid!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingPayment(null);
    }
  };

  const filteredClasses = classes.filter(cls => 
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.classId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search for a Class
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Enter class name, ID or subject"
            className="pl-10 pr-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading classes...</p>
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Select a Class</h3>
          <div className="max-h-64 overflow-y-auto">
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClasses.map(classObj => (
                  <tr 
                    key={classObj._id} 
                    className={`hover:bg-gray-50 ${selectedClass?._id === classObj._id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classObj.classId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{classObj.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classObj.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {classObj.schedule?.days?.join(', ')} {classObj.schedule?.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${classObj.monthlyFee}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleClassSelect(classObj)}
                        className={`text-blue-600 hover:text-blue-900 ${selectedClass?._id === classObj._id ? 'font-bold' : ''}`}
                      >
                        {selectedClass?._id === classObj._id ? 'Hide Students' : 'Show Students'}
                      </button>
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
        <div className="bg-white rounded-md shadow mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-800">
              Students Enrolled in {selectedClass.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Monthly Fee: ${selectedClass.monthlyFee} | Class ID: {selectedClass.classId}
            </p>
          </div>
          
          {loadingStudents ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-500">Loading students...</p>
            </div>
          ) : enrolledStudents.length > 0 ? (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Method
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {enrolledStudents.map((student) => {
                      const studentPaymentStatus = paymentStatus[student.student.sid];
                      const isPaid = studentPaymentStatus?.paid;
                      const studentDetail = studentDetails[student.student.sid];
                      
                      return (
                        <tr key={student._id} className={isPaid ? 'bg-green-50' : ''}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {student.student.sid}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{student.student.name}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {studentDetail?.paymentMethod || 'Cash/Invoice'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {isPaid ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
                                <CheckCircleIcon className="mr-1 h-4 w-4" /> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800">
                                <ClockIcon className="mr-1 h-4 w-4" /> Unpaid
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            {!isPaid && (
                              <button
                                onClick={() => handleMarkAsPaid(student, selectedClass)}
                                disabled={processingPayment === `${student.student.sid}-${selectedClass.classId}`}
                                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                              >
                                {processingPayment === `${student.student.sid}-${selectedClass.classId}` ? (
                                  <span className="inline-block animate-spin mr-1">⏳</span>
                                ) : (
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                )}
                                Mark as Paid
                              </button>
                            )}
                            {isPaid && (
                              <span className="text-green-600">
                                Paid on {new Date(studentPaymentStatus.paidDate!).toLocaleDateString()}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">No students enrolled in this class.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}