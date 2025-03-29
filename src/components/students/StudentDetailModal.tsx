import React, { useState, useEffect } from 'react';
import { 
  FiUser, FiUsers, FiDollarSign, FiBook, 
  FiX, FiEdit, FiLogOut, FiMail, FiFileText, FiAlertCircle 
} from 'react-icons/fi';

interface Student {
  _id: string;
  name: string;
  sid: string;
  email: string;
  contactNumber: string;
  classes?: string[];
  parent?: {
    name: string;
    email?: string;
    contactNumber?: string;
  };
  admissionFeeStatus?: {
    paid: boolean;
    amount?: number;
    paidDate?: string; // Updated field name
    receiptNumber?: string; // Added field
  };
  paymentMethod?: 'Cash' | 'Invoice'; // Match schema's enum
  notes?: string;
  createdAt?: string;
  joinedDate?: string;
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
  enrollmentDate: string;
  endDate?: string;
  adjustedFee?: number; // Added field
}

interface ClassDetails {
  classId: string;
  name: string;
  grade: number;
  subject: string;
  centerId: number;
  centerName?: string;
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
  };
  monthlyFee: number;
}

interface StudentDetailModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void; 
}

interface AdjustFeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (adjustedFee: number) => void;
  currentFee: number;
  loading: boolean;
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ 
  student, 
  isOpen, 
  onClose, 
  onEdit 
}) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classDetails, setClassDetails] = useState<{[key: string]: ClassDetails}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [unenrollLoading, setUnenrollLoading] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{enrollmentId: string, classId: string} | null>(null);
  const [alertMessage, setAlertMessage] = useState<{type: 'error' | 'success', message: string} | null>(null);
  const [adjustFeeDialogOpen, setAdjustFeeDialogOpen] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [currentClassFee, setCurrentClassFee] = useState<number>(0);
  const [savingAdjustedFee, setSavingAdjustedFee] = useState(false);

  useEffect(() => {
    if (isOpen && student?._id) {
      fetchStudentEnrollments();
    }
  }, [isOpen, student?._id]);

  const fetchStudentEnrollments = async () => {
    if (!student?.sid) return;
    
    setLoading(true);
    try {
      // Fetch the student's enrollments
      const enrollmentRes = await fetch(`/api/enrollment?studentId=${student.sid}`);
      if (!enrollmentRes.ok) throw new Error('Failed to fetch enrollments');
      
      const enrollmentData = await enrollmentRes.json();
      setEnrollments(enrollmentData.enrollments || []);
      
      // Fetch class details for each enrollment
      const classIds = enrollmentData.enrollments.map(
        (enrollment: Enrollment) => enrollment.class.classId
      );
      
      const classDetailsMap: {[key: string]: ClassDetails} = {};
      
      for (const classId of classIds) {
        const classRes = await fetch(`/api/class?classId=${classId}`);
        if (classRes.ok) {
          const classData = await classRes.json();
          
          // Fetch center name
          if (classData.centerId) {
            const centerRes = await fetch(`/api/center?cid=${classData.centerId}`);
            if (centerRes.ok) {
              const centerData = await centerRes.json();
              if (centerData.success && centerData.data) {
                classData.centerName = centerData.data.name;
              }
            }
          }
          
          classDetailsMap[classId] = classData;
        }
      }
      
      setClassDetails(classDetailsMap);
    } catch (err: any) {
      console.error('Error fetching enrollments:', err);
      setError(err.message || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  const initiateUnenroll = (enrollmentId: string, classId: string) => {
    setConfirmationData({ enrollmentId, classId });
    setShowConfirmDialog(true);
  };

  const handleUnenroll = async () => {
    if (!confirmationData) return;
    
    const { enrollmentId, classId } = confirmationData;
    setUnenrollLoading(enrollmentId);
    setShowConfirmDialog(false);
    
    try {
      // Use the DELETE endpoint with the id as a query parameter
      const response = await fetch(`/api/enrollment?id=${enrollmentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to unenroll');
      }
      
      // Remove the enrollment from the local state
      setEnrollments(enrollments.filter(e => e._id !== enrollmentId));
      setAlertMessage({ type: 'success', message: 'Student has been successfully unenrolled from the class.' });
      
    } catch (err) {
      console.error('Error unenrolling student:', err);
      setAlertMessage({ type: 'error', message: 'Failed to unenroll student. Please try again.' });
    } finally {
      setUnenrollLoading(null);
      setConfirmationData(null);
    }
  };

  const handleAdjustFee = (enrollmentId: string, currentFee: number) => {
    setSelectedEnrollmentId(enrollmentId);
    setCurrentClassFee(currentFee);
    setAdjustFeeDialogOpen(true);
  };

  const handleSaveAdjustedFee = async (adjustedFee: number) => {
    if (!selectedEnrollmentId) return;
    
    setSavingAdjustedFee(true);
    try {
      // Ensure we're sending a valid number
      const validFee = Number(adjustedFee);
      if (isNaN(validFee)) {
        throw new Error('Invalid fee amount');
      }
      
      console.log('Sending PATCH request with fee:', validFee);
      
      const response = await fetch('/api/enrollment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _id: selectedEnrollmentId,
          adjustedFee: validFee
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update fee');
      }
      
      const updatedEnrollment = await response.json();
      console.log('Response from server:', updatedEnrollment);
      
      // Immediately update the enrollment in local state
      setEnrollments(prevEnrollments => 
        prevEnrollments.map(e => 
          e._id === selectedEnrollmentId ? updatedEnrollment : e
        )
      );
      
      setAlertMessage({ 
        type: 'success', 
        message: 'Adjusted fee has been updated successfully' 
      });
      
      // Re-fetch all data to ensure everything is in sync
      setTimeout(() => {
        if (student?.sid) {
          fetchStudentEnrollments();
        }
      }, 500);
    } catch (err: any) {
      console.error('Error updating fee:', err);
      setAlertMessage({
        type: 'error',
        message: err.message || 'Failed to update adjusted fee'
      });
    } finally {
      setSavingAdjustedFee(false);
      setAdjustFeeDialogOpen(false);
      setSelectedEnrollmentId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    // Convert 24h format to 12h format
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const renderStatusBadge = (status: string) => {
    const statusColors: {[key: string]: string} = {
      ACTIVE: 'bg-green-100 text-green-800',
      WITHDRAWN: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      PENDING: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  // Render a section button for mobile navigation
  const renderSectionButton = (id: string, label: string, icon: React.ReactNode) => (
    <button 
      onClick={() => setActiveSection(id)}
      className={`flex flex-col items-center justify-center p-2 ${activeSection === id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-0 sm:p-2">
      <div className="bg-white rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-h-[95vh] sm:w-full sm:max-w-2xl overflow-hidden flex flex-col">
        {/* Header - Compact */}
        <div className="border-b py-2 px-3 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-800">{student.name}</h2>
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile navigation - Compact */}
        <div className="sm:hidden flex justify-around border-b py-1">
          {renderSectionButton('personal', 'Personal', <FiUser className="w-5 h-5" />)}
          {renderSectionButton('parent', 'Parent', <FiUsers className="w-5 h-5" />)}
          {renderSectionButton('payment', 'Payment', <FiDollarSign className="w-5 h-5" />)}
          {renderSectionButton('classes', 'Classes', <FiBook className="w-5 h-5" />)}
        </div>
        
        {/* Content - More compact */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Student basic info - Compact */}
          <div className="flex items-center mb-3 bg-gray-50 p-2 rounded-lg">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">
              {student.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="ml-3">
              <div className="flex items-baseline">
                <h3 className="text-base font-semibold text-gray-800">{student.name}</h3>
                <p className="text-xs text-gray-500 ml-2">ID: {student.sid}</p>
              </div>
              <div className="flex gap-3 text-xs mt-1">
                <p className="text-gray-600">{student.email}</p>
                <p className="text-gray-600">{student.contactNumber}</p>
              </div>
            </div>
          </div>

          {/* Personal Information - Compact */}
          <div className={`mb-3 ${activeSection !== 'personal' && 'hidden sm:block'}`}>
            <h4 className="text-sm font-medium text-gray-800 mb-1 pb-1 border-b flex items-center">
              <FiMail className="mr-1 text-blue-500 w-4 h-4" />
              Contact Information
            </h4>
            <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg shadow-sm text-sm">
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-gray-800">{student.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-gray-800">{student.contactNumber || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          {/* Parent Information - Compact */}
          <div className={`mb-3 ${activeSection !== 'parent' && 'hidden sm:block'}`}>
            <h4 className="text-sm font-medium text-gray-800 mb-1 pb-1 border-b flex items-center">
              <FiUsers className="mr-1 text-blue-500 w-4 h-4" />
              Parent/Guardian
            </h4>
            {student.parent ? (
              <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg shadow-sm text-sm">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-gray-800">{student.parent.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Contact</p>
                  <p className="text-gray-800">{student.parent.contactNumber || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-gray-800">{student.parent.email || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic">No parent information available</p>
            )}
          </div>
          
          {/* Payment Information - Compact */}
          <div className={`mb-3 ${activeSection !== 'payment' && 'hidden sm:block'}`}>
            <h4 className="text-sm font-medium text-gray-800 mb-1 pb-1 border-b flex items-center">
              <FiDollarSign className="mr-1 text-blue-500 w-4 h-4" />
              Payment Information
            </h4>
            <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg shadow-sm text-sm">
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="text-gray-800">{student.paymentMethod || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Admission Fee</p>
                <div className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${student.admissionFeeStatus?.paid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>{student.admissionFeeStatus?.paid ? 'Paid' : 'Not Paid'}</span>
                </div>
              </div>
              {student.admissionFeeStatus?.paid && (
                <>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-gray-800">${student.admissionFeeStatus?.amount || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-gray-800">{formatDate(student.admissionFeeStatus?.paidDate)}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Classes - Compact with Unenroll button */}
          <div className={`mb-3 ${activeSection !== 'classes' && 'hidden sm:block'}`}>
            <h4 className="text-sm font-medium text-gray-800 mb-1 pb-1 border-b flex items-center">
              <FiBook className="mr-1 text-blue-500 w-4 h-4" />
              Enrolled Classes
            </h4>
            
            {loading ? (
              <div className="flex justify-center items-center h-16">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 p-2 text-sm">{error}</div>
            ) : enrollments.length > 0 ? (
              <div className="space-y-2">
                {enrollments.map((enrollment) => {
                  const classInfo = classDetails[enrollment.class.classId];
                  const isActive = enrollment.status === 'ACTIVE';
                  
                  return (
                    <div key={enrollment._id} className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="font-medium text-sm">{enrollment.class.name}</h5>
                        <div className="flex items-center space-x-2">
                          {renderStatusBadge(enrollment.status)}
                          
                          <button
                            onClick={() => initiateUnenroll(enrollment._id, enrollment.class.classId)}
                            disabled={unenrollLoading === enrollment._id}
                            className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded flex items-center"
                          >
                            {unenrollLoading === enrollment._id ? (
                              <span className="animate-pulse">Processing...</span>
                            ) : (
                              <>
                                <FiLogOut className="w-3 h-3 mr-1" />
                                Unenroll
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {classInfo && (
                        <div className="text-xs">
                          <div className="grid grid-cols-3 gap-1">
                            <div>
                              <span className="text-gray-500">Subject:</span> {classInfo.subject}
                            </div>
                            <div>
                              <span className="text-gray-500">Grade:</span> {classInfo.grade}
                            </div>
                            <div>
                              <span className="text-gray-500">Fee:</span> ${classInfo.monthlyFee}
                              {enrollment.adjustedFee !== undefined && enrollment.adjustedFee !== classInfo.monthlyFee && (
                                <span className="ml-1 text-green-600">(${enrollment.adjustedFee})</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-2 flex justify-between items-center">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAdjustFee(enrollment._id, classInfo.monthlyFee)}
                                className="text-xs px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded flex items-center"
                              >
                                <FiDollarSign className="w-3 h-3 mr-1" />
                                {enrollment.adjustedFee !== undefined && enrollment.adjustedFee !== classInfo.monthlyFee ? 'Change Fee' : 'Adjust Fee'}
                              </button>
                            </div>
                            
                            <div className="text-gray-500">
                              {classInfo.schedule?.days.join(', ')} • {formatTime(classInfo.schedule?.startTime)}
                            </div>
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-500">
                            <span>Enrolled: {formatDate(enrollment.enrollmentDate).split(', ')[0]}</span>
                            {enrollment.endDate && (
                              <span className="ml-2">• Ended: {formatDate(enrollment.endDate).split(', ')[0]}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 p-2 bg-gray-50 rounded text-center text-sm">
                <FiBook className="mx-auto mb-1 text-gray-400 w-4 h-4" />
                <p>No classes enrolled</p>
              </div>
            )}
          </div>
          
          {/* Additional Notes - Compact */}
          {student.notes && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-800 mb-1 pb-1 border-b flex items-center">
                <FiFileText className="mr-1 text-blue-500 w-4 h-4" />
                Notes
              </h4>
              <div className="bg-white p-2 rounded-lg shadow-sm text-xs">
                <p className="text-gray-800 whitespace-pre-line">{student.notes}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions - Compact */}
        <div className="border-t py-2 px-3 flex justify-end space-x-2 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
          >
            <FiEdit className="w-3 h-3 mr-1" />
            Edit Student
          </button>
        </div>
      </div>

      {/* Alert Component */}
      {alertMessage && (
        <div className={`fixed inset-x-0 top-4 mx-auto max-w-sm z-50 p-4 rounded-md shadow-lg ${
          alertMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${
              alertMessage.type === 'success' ? 'text-green-500' : 'text-red-500'
            }`}>
              <FiAlertCircle className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                alertMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {alertMessage.message}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setAlertMessage(null)}
                className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
              >
                <FiX className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 mx-4">
            <div className="text-center mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <FiAlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-3">Confirm Unenrollment</h3>
              <p className="text-sm text-gray-500 mt-1">
                Are you sure you want to unenroll this student from this class? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center space-x-3">
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmationData(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={handleUnenroll}
              >
                Unenroll
              </button>
            </div>
          </div>
        </div>
      )}

      <AdjustFeeDialog
        isOpen={adjustFeeDialogOpen}
        onClose={() => setAdjustFeeDialogOpen(false)}
        onSave={handleSaveAdjustedFee}
        currentFee={currentClassFee}
        loading={savingAdjustedFee}
      />
    </div>
  );
};

const AdjustFeeDialog: React.FC<AdjustFeeDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentFee,
  loading
}) => {
  const [fee, setFee] = useState<number>(currentFee);

  // Reset fee when dialog opens with new currentFee
  useEffect(() => {
    setFee(currentFee);
  }, [currentFee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure we're passing a number
    onSave(Number(fee));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Adjust Monthly Fee</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Standard Fee: ${currentFee}
            </label>
            <input
              type="number"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter adjusted fee amount"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the adjusted fee amount for this student. Leave as is for standard fee.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-20 border-t-white rounded-full mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Fee'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentDetailModal;