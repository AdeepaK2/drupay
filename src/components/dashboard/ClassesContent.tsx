import React, { useState, useEffect } from 'react';

// Define TypeScript interfaces
interface ClassSchedule {
  days: string[];
  startTime: string;
  endTime: string;
}

interface ClassData {
  _id: string;
  classId: string;
  name: string;
  centerId: number;
  grade: number;
  subject: string;
  schedule: ClassSchedule;
  monthlyFee: number;
  createdAt: string;
  updatedAt: string;
}

interface ClassFormData {
  name: string;
  centerId: number;
  grade: number;
  subject: string;
  schedule: ClassSchedule;
  monthlyFee: number;
  classId?: string; // Optional for editing existing classes
}

interface EnrollmentCounts {
  [key: string]: number;
}

export default function ClassesContent() {
  // State variables
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Enrollment counts
  const [enrollmentCounts, setEnrollmentCounts] = useState<EnrollmentCounts>({});
  const [loadingCounts, setLoadingCounts] = useState<boolean>(false);
  
  // Search and sort states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('name');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  
  // Form state for add/edit
  const initialFormState: ClassFormData = {
    name: '',
    centerId: 1,
    grade: 1,
    subject: '',
    schedule: {
      days: [],
      startTime: '09:00',
      endTime: '10:00'
    },
    monthlyFee: 0
  };
  const [formData, setFormData] = useState<ClassFormData>(initialFormState);

  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch enrollment counts when classes change
  useEffect(() => {
    if (classes.length > 0) {
      fetchEnrollmentCounts();
    }
  }, [classes]);

  // Clear success message after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // API Functions
  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/class');
      
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }
      
      const data = await response.json();
      setClasses(data);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch enrollment counts for all classes
  const fetchEnrollmentCounts = async () => {
    try {
      setLoadingCounts(true);
      const counts: EnrollmentCounts = {};
      
      // Create an array of promises for parallel fetching
      const promises = classes.map(async (cls) => {
        const response = await fetch(`/api/enrollment?classId=${cls.classId}&status=active`);
        if (response.ok) {
          const data = await response.json();
          counts[cls.classId] = data.enrollments.length;
        } else {
          counts[cls.classId] = 0;
        }
      });
      
      // Wait for all requests to complete
      await Promise.all(promises);
      setEnrollmentCounts(counts);
    } catch (err) {
      console.error('Error fetching enrollment counts:', err);
      // Don't set error state to avoid disrupting the main UI
    } finally {
      setLoadingCounts(false);
    }
  };

  const addClass = async (classData: ClassFormData) => {
    try {
      setLoading(true);
      const response = await fetch('/api/class', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create class');
      }

      const newClass = await response.json();
      setClasses((prevClasses) => [...prevClasses, newClass]);
      setSuccessMessage('Class created successfully');
      setIsAddModalOpen(false);
      setFormData(initialFormState);
      
      // Update enrollment counts for the new class
      setEnrollmentCounts(prev => ({
        ...prev,
        [newClass.classId]: 0
      }));
    } catch (err: any) {
      console.error('Error creating class:', err);
      setError(err.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const updateClass = async (classData: ClassFormData) => {
    if (!classData.classId) {
      setError('Class ID is required for updates');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/class', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update class');
      }

      const updatedClass = await response.json();
      setClasses((prevClasses) => 
        prevClasses.map((cls) => 
          cls.classId === updatedClass.classId ? updatedClass : cls
        )
      );
      setSuccessMessage('Class updated successfully');
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Error updating class:', err);
      setError(err.message || 'Failed to update class');
    } finally {
      setLoading(false);
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/class?classId=${classId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete class');
      }

      setClasses((prevClasses) => 
        prevClasses.filter((cls) => cls.classId !== classId)
      );
      
      // Remove enrollment count for deleted class
      setEnrollmentCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[classId];
        return newCounts;
      });
      
      setSuccessMessage('Class deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedClass(null);
    } catch (err: any) {
      console.error('Error deleting class:', err);
      setError(err.message || 'Failed to delete class');
    } finally {
      setLoading(false);
    }
  };

  // Event handlers
  const openAddModal = () => {
    setFormData(initialFormState);
    setIsAddModalOpen(true);
  };

  const openEditModal = (cls: ClassData) => {
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      centerId: cls.centerId,
      grade: cls.grade,
      subject: cls.subject,
      schedule: cls.schedule,
      monthlyFee: cls.monthlyFee,
      classId: cls.classId
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (cls: ClassData) => {
    setSelectedClass(cls);
    setIsDeleteModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties (like schedule.startTime)
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof ClassFormData] as Record<string, any>,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'monthlyFee' || name === 'grade' || name === 'centerId' ? Number(value) : value
      }));
    }
  };

  const handleDaysChange = (day: string) => {
    setFormData(prev => {
      const currentDays = prev.schedule.days;
      const updatedDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          days: updatedDays
        }
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditModalOpen) {
      updateClass(formData);
    } else {
      addClass(formData);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
  };

  // Format schedule for display
  const formatSchedule = (schedule: ClassSchedule) => {
    const daysAbbrev = schedule.days.map(day => day.substring(0, 3)).join(', ');
    return `${daysAbbrev} ${schedule.startTime} - ${schedule.endTime}`;
  };

  // Get student count for a class
  const getStudentCount = (classId: string) => {
    return enrollmentCounts[classId] !== undefined ? enrollmentCounts[classId] : '-';
  };

  // Filter and sort classes
  const filteredAndSortedClasses = classes
    .filter(cls => 
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.classId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'grade':
          return a.grade - b.grade;
        case 'subject':
          return a.subject.localeCompare(b.subject);
        case 'fee':
          return a.monthlyFee - b.monthlyFee;
        case 'students':
          return (enrollmentCounts[a.classId] || 0) - (enrollmentCounts[b.classId] || 0);
        default:
          return 0;
      }
    });

  return (
    <div className="bg-white shadow-md rounded p-4 sm:p-6 max-w-full">
      <h2 className="text-xl font-semibold mb-2 sm:mb-4">Classes Management</h2>
      
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded mb-4 relative text-sm">
          <span className="pr-5 block">{successMessage}</span>
          <button
            className="absolute top-1 right-1 text-green-700"
            onClick={() => setSuccessMessage(null)}
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 relative text-sm">
          <span className="pr-5 block">{error}</span>
          <button
            className="absolute top-1 right-1 text-red-700"
            onClick={() => setError(null)}
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}
      
      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search classes..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute left-3 top-2.5">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label htmlFor="sort" className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
          <select
            id="sort"
            value={sortOption}
            onChange={handleSort}
            className="border rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow sm:flex-grow-0"
          >
            <option value="name">Name</option>
            <option value="grade">Grade</option>
            <option value="subject">Subject</option>
            <option value="fee">Fee</option>
            <option value="students">Students</option>
          </select>
        </div>
      </div>
      
      {/* Loading indicator */}
      {loading && !classes.length ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Add New Class Card */}
          <div 
            className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center h-72 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={openAddModal}
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-lg font-medium text-blue-600">Add New Class</p>
            <p className="text-sm text-gray-500 text-center mt-2">
              Create a new class with schedule and details
            </p>
          </div>
          
          {/* Class Cards */}
          {filteredAndSortedClasses.map((cls) => (
            <div 
              key={cls._id} 
              className="bg-white border rounded-lg shadow-sm overflow-hidden h-72 flex flex-col transition-shadow hover:shadow-md"
            >
              {/* Class Header */}
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-lg truncate pr-2" title={cls.name}>
                    {cls.name}
                  </h3>
                  <span className="text-xs bg-white bg-opacity-30 px-2 py-1 rounded">
                    {cls.classId}
                  </span>
                </div>
                <p className="text-sm text-blue-100 mt-1">
                  Grade {cls.grade} • {cls.subject}
                </p>
              </div>
              
              {/* Class Details */}
              <div className="p-4 flex-grow">
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Monthly Fee</p>
                    <p className="font-semibold">${cls.monthlyFee.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Students</p>
                    <div className="flex items-center">
                      <p className="font-semibold">{getStudentCount(cls.classId)}</p>
                      {loadingCounts && enrollmentCounts[cls.classId] === undefined && (
                        <div className="ml-2 w-3 h-3 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-gray-500 text-sm">Schedule</p>
                  <p className="font-medium text-sm">{formatSchedule(cls.schedule)}</p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="border-t p-3 bg-gray-50 mt-auto">
                <div className="flex justify-between">
                  <button
                    onClick={() => openEditModal(cls)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(cls)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* No Classes Found */}
          {filteredAndSortedClasses.length === 0 && !loading && (
            <div className="col-span-full text-center py-10 text-gray-500">
              {searchTerm ? 
                "No classes match your search criteria." :
                "No classes found. Click 'Add New Class' to create one."}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Class Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {isEditModalOpen ? "Edit Class" : "Add New Class"}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Grade Level
                  </label>
                  <input
                    type="number"
                    name="grade"
                    value={formData.grade}
                    onChange={handleFormChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    min="1"
                    max="12"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Center ID
                  </label>
                  <input
                    type="number"
                    name="centerId"
                    value={formData.centerId}
                    onChange={handleFormChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleFormChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Monthly Fee ($)
                </label>
                <input
                  type="number"
                  name="monthlyFee"
                  value={formData.monthlyFee}
                  onChange={handleFormChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Schedule Days
                </label>
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div key={day} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`day-${day}`}
                        checked={formData.schedule.days.includes(day)}
                        onChange={() => handleDaysChange(day)}
                        className="mr-1"
                      />
                      <label htmlFor={`day-${day}`} className="text-xs sm:text-sm">{day.substring(0, 3)}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="schedule.startTime"
                    value={formData.schedule.startTime}
                    onChange={handleFormChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    name="schedule.endTime"
                    value={formData.schedule.endTime}
                    onChange={handleFormChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : isEditModalOpen ? 'Update Class' : 'Add Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedClass && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4 text-red-600">Delete Class</h2>
            <p className="mb-6 text-sm sm:text-base">
              Are you sure you want to delete the class "{selectedClass.name}"? This action cannot be undone.
            </p>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteClass(selectedClass.classId)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}