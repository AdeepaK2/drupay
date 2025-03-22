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

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSelectedClassId('');
      setError('');
      setSearchTerm('');
      setSelectedGrade('');
      setSelectedCenter('');
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

      const response = await fetch('/api/enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          student: { 
            _id: student?._id,
            sid: student?.sid 
          }, 
          class: { classId: selectedClassId }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enroll student');
      }

      const updatedStudent = await response.json();
      onEnrollSuccess(updatedStudent);
      onClose();
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

          {/* Class List */}
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
                    <div className="flex justify-between">
                      <span>
                        {cls.name} (Grade {cls.grade})
                      </span>
                      <span className="text-gray-500">{cls.centerName}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-gray-500">No classes found</div>
            )}
          </div>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isLoading ? 'Enrolling...' : 'Enroll'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentModal;