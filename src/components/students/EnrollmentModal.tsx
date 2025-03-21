import React, { useState, useEffect } from 'react';
import { Student } from '@/types/student';

interface EnrollmentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onEnrollmentComplete: () => void;
}

interface ClassOption {
  _id: string;
  classId: string;
  name: string;
  subject: string;
  grade: number;
  monthlyFee: number;
}

export default function EnrollmentModal({ 
  student, 
  isOpen, 
  onClose,
  onEnrollmentComplete 
}: EnrollmentModalProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingClasses, setFetchingClasses] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  // Fetch available classes when modal opens
  useEffect(() => {
    if (isOpen && student) {
      fetchClasses();
    }
  }, [isOpen, student]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedClass('');
      setError('');
      setSuccess('');
      setShowConfirmation(false);
    }
  }, [isOpen]);

  const fetchClasses = async () => {
    if (!student) return;
    
    try {
      setFetchingClasses(true);
      // Optional: You can add filters by grade level if needed
      const response = await fetch(`/api/class`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }
      
      const data = await response.json();
      setClasses(data);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load available classes');
    } finally {
      setFetchingClasses(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClass) {
      setError('Please select a class');
      return;
    }

    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    // User confirmed, proceed with enrollment
    try {
      setLoading(true);
      setError('');
      
      const selectedClassObj = classes.find(c => c.classId === selectedClass);
      
      if (!selectedClassObj || !student) {
        throw new Error('Invalid class or student selection');
      }

      const enrollmentData = {
        student: {
          sid: student.sid,
          name: student.name,
        },
        class: {
          classId: selectedClassObj.classId,
          name: selectedClassObj.name,
        },
        enrollmentDate: new Date(),
        status: 'active'
      };

      const response = await fetch('/api/enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrollmentData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create enrollment');
      }

      setSuccess('Student has been successfully enrolled in the class.');
      setShowConfirmation(false);
      
      // Notify parent component about the successful enrollment
      setTimeout(() => {
        onEnrollmentComplete();
        onClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('Enrollment error:', err);
      setError(err.message || 'Failed to enroll student');
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {showConfirmation ? 'Confirm Enrollment' : 'Enroll Student in Class'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        
        {showConfirmation ? (
          <div>
            <p className="mb-4">
              Are you sure you want to enroll <strong>{student?.name}</strong> in{" "}
              <strong>{classes.find(c => c.classId === selectedClass)?.name}</strong>?
            </p>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm Enrollment'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <p>
                <span className="font-semibold">Student:</span> {student?.name} ({student?.sid})
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Select Class
              </label>
              
              {fetchingClasses ? (
                <div className="flex justify-center my-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <select
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  required
                >
                  <option value="">-- Select a class --</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls.classId}>
                      {cls.name} - Grade {cls.grade} ({cls.subject}) - ${cls.monthlyFee}/month
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!selectedClass || loading}
              >
                {loading ? 'Processing...' : 'Enroll Student'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}