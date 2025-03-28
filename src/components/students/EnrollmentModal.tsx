import React, { useState, useEffect } from 'react';
import { Student } from '@/types/student'; // Import the Student type for consistency

// Update Class interface to match what the API returns
interface Class {
  _id: string;
  classId: string;
  name: string;
  grade: number;
  centerId: number;
  subject: string;
  monthlyFee: number;
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
  };
  centerName?: string; // We'll add this property after fetching
}

interface Center {
  _id: string;
  cid: number;
  name: string;
  location: string;
  admissionFee: number;
}

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onEnrollSuccess: (updatedStudent: Student) => void;
}

const EnrollmentModal: React.FC<EnrollmentModalProps> = ({ isOpen, onClose, student, onEnrollSuccess }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [centers, setCenters] = useState<Center[]>([]);
  const [enrollmentDate, setEnrollmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSelectedClassId('');
      setError('');
      setSearchTerm('');
      setSelectedGrade('');
      setSelectedCenter('');
      setEnrollmentDate(new Date().toISOString().split('T')[0]); // Set to today's date
      fetchCentersAndClasses();
    }
  }, [isOpen]);

  useEffect(() => {
    filterClasses();
  }, [searchTerm, selectedGrade, selectedCenter, classes]);

  // Sequential fetching to ensure centers are loaded before processing classes
  const fetchCentersAndClasses = async () => {
    try {
      // First, fetch centers and wait for completion
      const centersData = await fetchCenters();
      if (centersData) {
        // Then fetch and process classes using the centers data
        await fetchClasses(centersData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    }
  };

  const fetchCenters = async () => {
    try {
      const response = await fetch('/api/center');
      if (!response.ok) {
        throw new Error('Failed to fetch centers');
      }
      
      const responseData = await response.json();
      
      // Check if the response has the expected structure
      if (responseData.success && Array.isArray(responseData.data)) {
        setCenters(responseData.data);
        return responseData.data; // Return centers data for use in fetchClasses
      }
      
      return null;
    } catch (err) {
      console.error("Error fetching centers:", err);
      setError('Failed to load centers');
      return null;
    }
  };

  const fetchClasses = async (centersData: Center[]) => {
    try {
      const response = await fetch('/api/class');
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }
      
      const classesData = await response.json();
      
      // Check if the response is an array
      if (Array.isArray(classesData)) {
        // Attach center names to classes
        const classesWithCenterNames = classesData.map((cls: Class) => {
          const center = centersData.find(c => c.cid === cls.centerId);
          return {
            ...cls,
            centerName: center ? center.name : 'Unknown Center'
          };
        });
        
        setClasses(classesWithCenterNames);
        setFilteredClasses(classesWithCenterNames);
      } else {
        throw new Error('Invalid classes data format');
      }
    } catch (err) {
      console.error("Error fetching classes:", err);
      setError('Failed to load classes');
    }
  };

  const filterClasses = () => {
    let filtered = classes;

    if (searchTerm) {
      filtered = filtered.filter((cls) =>
        cls.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedGrade) {
      filtered = filtered.filter((cls) => cls.grade?.toString() === selectedGrade);
    }

    if (selectedCenter) {
      filtered = filtered.filter((cls) =>
        cls.centerName === selectedCenter // Use exact match instead of lowercase
      );
    }

    setFilteredClasses(filtered);
  };

  const handleEnroll = async () => {
    if (!selectedClassId) {
      setError('Please select a class');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Get selected class details to show fee information
      const selectedClassDetails = classes.find(cls => cls.classId === selectedClassId);
      const monthlyFee = selectedClassDetails?.monthlyFee || 0;

      // Create the enrollment with the specified enrollment date
      const enrollmentResponse = await fetch('/api/enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          student: { 
            _id: student?._id,
            sid: student?.sid 
          }, 
          class: { classId: selectedClassId },
          startDate: enrollmentDate // Include the enrollment date
        }),
      });

      if (!enrollmentResponse.ok) {
        const errorData = await enrollmentResponse.json();
        throw new Error(errorData.error || 'Failed to enroll student');
      }

      const enrollmentData = await enrollmentResponse.json();
      
      // Now create a prorated payment record for the current month
      const currentDate = new Date(enrollmentDate);
      const currentMonth = currentDate.getMonth() + 1; // 1-based month
      const currentYear = currentDate.getFullYear();
      
      const paymentResponse = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student?.sid,
          classId: selectedClassId,
          academicYear: currentYear,
          month: currentMonth,
          notes: `Auto-generated payment for enrollment on ${enrollmentDate}`,
          useSimpleProration: true // Add this flag to use simple proportional proration
        }),
      });
      
      if (!paymentResponse.ok) {
        // If payment creation fails, log the error but don't block enrollment
        console.error('Failed to create prorated payment record', await paymentResponse.json());
        // Still continue with enrollment success
        onEnrollSuccess(enrollmentData);
        onClose();
      } else {
        const paymentData = await paymentResponse.json();
        console.log('Prorated payment created:', paymentData);
        
        // Calculate remaining balance if prorated
        const proratedAmount = paymentData.payment?.amount || monthlyFee;
        const isProrated = proratedAmount < monthlyFee;
        
        if (isProrated || paymentData.payment?.amount < monthlyFee) {
          // Get enrollment week information
          const enrollDate = new Date(enrollmentDate);
          const monthStartDate = new Date(currentYear, currentMonth - 1, 1);
          const monthEndDate = new Date(currentYear, currentMonth, 0);
          const daysInMonth = monthEndDate.getDate();
          const weeksInMonth = Math.ceil(daysInMonth / 7);
          
          const dayOfMonth = enrollDate.getDate();
          const enrollmentWeek = Math.ceil(dayOfMonth / 7);
          
          // Calculate remaining weeks (including enrollment week)
          const remainingWeeks = weeksInMonth - enrollmentWeek + 1;
          
          // Calculate weekly rate
          const weeklyRate = monthlyFee / weeksInMonth;
          
          // Calculate prorated amount based on remaining weeks
          const calculatedAmount = remainingWeeks * weeklyRate;
          const displayAmount = Math.round(calculatedAmount); // Round to whole number
          
          // If our calculation doesn't match the API's, update the payment with our calculated amount
          if (Math.abs(displayAmount - proratedAmount) > 0.1) {
            try {
              // Update the payment with our calculated amount
              await fetch('/api/payment', {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  _id: paymentData.payment._id,
                  amount: displayAmount, 
                  notes: `Auto-generated payment for enrollment on ${enrollmentDate}. Weekly proration: ${remainingWeeks}/${weeksInMonth} weeks.`
                }),
              });
            } catch (err) {
              console.error('Failed to update payment amount', err);
            }
          }
          
          const percentPaid = Math.round((displayAmount/monthlyFee) * 100);
          
          // Create a custom success message with detailed prorated payment info
          const successMessage = {
            ...enrollmentData,
            message: `${student?.name} has been successfully enrolled in ${selectedClassDetails?.name}.

PAYMENT DETAILS:
• Joined in week ${enrollmentWeek} of ${weeksInMonth}
• Paying for ${remainingWeeks} of ${weeksInMonth} weeks
• Full monthly fee: £${monthlyFee}
• Prorated amount: £${displayAmount} (${percentPaid}% of full fee)

A payment record has been automatically created.`
          };
          
          onEnrollSuccess(successMessage);
          onClose();
        } else {
          // Full payment required (enrolled in first week)
          const successMessage = {
            ...enrollmentData,
            message: `${student?.name} has been successfully enrolled in ${selectedClassDetails?.name}.

PAYMENT DETAILS:
• Full monthly fee: £${monthlyFee.toFixed(2)}
• Enrolled in first week, so full payment is required.

A payment record has been automatically created.`
          };
          
          onEnrollSuccess(successMessage);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while enrolling the student');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Enroll {student.name} in a Class</h2>
        </div>
        <div className="p-4">
          {error && <div className="text-red-500 mb-4">{error}</div>}

          {/* Enrollment Date Field */}
          <div className="mb-4">
            <label htmlFor="enrollmentDate" className="block text-sm font-medium text-gray-700 mb-1">
              Enrollment Date
            </label>
            <input
              type="date"
              id="enrollmentDate"
              value={enrollmentDate}
              onChange={(e) => setEnrollmentDate(e.target.value)}
              className="border rounded-md px-3 py-2 w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Payment will be prorated based on this enrollment date
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by class name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-md px-3 py-2 w-full"
            />
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="border rounded-md px-3 py-2 w-full"
            >
              <option value="">Filter by Grade</option>
              {[...new Set(classes.map((cls) => cls.grade))].sort().map((grade) => (
                <option key={grade} value={grade.toString()}>
                  Grade {grade}
                </option>
              ))}
            </select>
            <select
              value={selectedCenter}
              onChange={(e) => setSelectedCenter(e.target.value)}
              className="border rounded-md px-3 py-2 w-full"
            >
              <option value="">Filter by Center</option>
              {centers.map((center) => (
                <option key={center._id} value={center.name}>
                  {center.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class List with Fees */}
          <div className="max-h-64 overflow-y-auto border rounded-md">
            {filteredClasses.length > 0 ? (
              <ul>
                {filteredClasses.map((cls) => (
                  <li
                    key={cls.classId}
                    className={`p-2 cursor-pointer ${
                      selectedClassId === cls.classId ? 'bg-blue-100' : ''
                    } hover:bg-blue-50`}
                    onClick={() => setSelectedClassId(cls.classId)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{cls.name}</span>
                        <span className="ml-2 text-sm text-gray-600">(Grade {cls.grade})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 mr-2">{cls.centerName}</span>
                        <span className="font-semibold">£{cls.monthlyFee}/month</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-gray-500">No classes found</div>
            )}
          </div>
          
          {selectedClassId && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
              <p>
                <span className="font-medium">Note:</span> A prorated payment record will be automatically created for the current month based on the enrollment date.
              </p>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleEnroll}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? 'Enrolling...' : 'Enroll'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentModal;