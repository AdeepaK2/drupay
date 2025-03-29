import React, { useState, useEffect, useRef } from 'react';
import StudentDetailModal from '../students/StudentDetailModal';
import StudentEditModal from '../students/StudentEditModal';
import AddStudentModal from '../students/AddStudentModal';
import EnrollmentModal from '../students/EnrollmentModal';
import StudentPaymentModal from '../students/StudentPaymentModal';
import { Student } from '@/types/student';
// Import icons
import { 
  UserPlusIcon, 
  CreditCardIcon, 
  EllipsisVerticalIcon, 
  TrashIcon, 
  PencilIcon, 
  EyeIcon,
  ExclamationTriangleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

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
  amount: number;
  status: string;
  month: number;
  academicYear: number;
}

export default function StudentsContent() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('name');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  // Delete confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletionChecks, setDeletionChecks] = useState<{
    enrollments: Enrollment[];
    pendingPayments: Payment[];
    checkingEnrollments: boolean;
    checkingPayments: boolean;
  }>({
    enrollments: [],
    pendingPayments: [],
    checkingEnrollments: false,
    checkingPayments: false,
  });

  // Ref for handling outside clicks (to close dropdowns)
  const dropdownRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  useEffect(() => {
    fetchStudents();
    
    // Add event listener to close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && 
          dropdownRefs.current[openDropdownId] && 
          !dropdownRefs.current[openDropdownId]?.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [page, sortOption]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/student?page=${page}&limit=10&sort=${sortOption}`);
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      const data = await response.json();
      setStudents(data.students);
      setTotalPages(data.pagination.pages);
      setLoading(false);
    } catch (err) {
      setError('Error fetching students');
      setLoading(false);
      console.error(err);
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
    setPage(1); // Reset to first page when changing sort
  };

  const openDetailModal = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
    setOpenDropdownId(null); // Close dropdown if open
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
    setOpenDropdownId(null); // Close dropdown if open
  };

  const openEnrollmentModal = (student: Student) => {
    setSelectedStudent(student);
    setIsEnrollmentModalOpen(true);
    setOpenDropdownId(null); // Close dropdown if open
  };

  const openPaymentModal = (student: Student) => {
    setSelectedStudent(student);
    setIsPaymentModalOpen(true);
    setOpenDropdownId(null); // Close dropdown if open
  };

  const openAddStudentModal = () => {
    setIsAddStudentModalOpen(true);
  };

  const closeAddStudentModal = () => {
    setIsAddStudentModalOpen(false);
  };

  const toggleDropdown = (studentId: string) => {
    if (openDropdownId === studentId) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(studentId);
    }
  };

  const handleStudentUpdate = (updatedStudent: Student) => {
    // Update the student in the local state
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student._id === updatedStudent._id ? updatedStudent : student
      )
    );
    setSelectedStudent(updatedStudent);
  };

  const handleAddStudentSuccess = (newStudent: Student) => {
    setStudents((prevStudents) => [newStudent, ...prevStudents]);
    setSuccessMessage('Student added successfully');
    closeAddStudentModal();
  };

  const handleEnrollmentSuccess = (updatedStudent: Student) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) =>
        student._id === updatedStudent._id ? updatedStudent : student
      )
    );
    setSuccessMessage(`${updatedStudent.name} has been successfully enrolled in the class.`);
    setIsEnrollmentModalOpen(false);
  };

  // Delete student functions
  const initiateDelete = async (student: Student) => {
    setStudentToDelete(student);
    setShowDeleteConfirm(true);
    setOpenDropdownId(null); // Close dropdown
    
    // Reset deletion checks
    setDeletionChecks({
      enrollments: [],
      pendingPayments: [],
      checkingEnrollments: true,
      checkingPayments: true,
    });
    
    try {
      // Check for enrollments
      const enrollmentResponse = await fetch(`/api/enrollment?studentId=${student.sid}`);
      if (enrollmentResponse.ok) {
        const enrollmentData = await enrollmentResponse.json();
        const activeEnrollments = enrollmentData.enrollments.filter(
          (e: Enrollment) => e.status === 'ACTIVE'
        );
        setDeletionChecks(prev => ({
          ...prev,
          enrollments: activeEnrollments,
          checkingEnrollments: false
        }));
        
        // Only check payments if there are enrollments
        if (activeEnrollments.length > 0) {
          // Check for pending payments
          const paymentResponse = await fetch(`/api/payment?studentId=${student.sid}&status=pending`);
          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            setDeletionChecks(prev => ({
              ...prev,
              pendingPayments: paymentData.payments || [],
              checkingPayments: false
            }));
          }
        } else {
          setDeletionChecks(prev => ({
            ...prev,
            checkingPayments: false
          }));
        }
      } else {
        setDeletionChecks(prev => ({
          ...prev,
          checkingEnrollments: false,
          checkingPayments: false
        }));
      }
    } catch (err) {
      console.error("Error checking student dependencies:", err);
      setDeletionChecks({
        enrollments: [],
        pendingPayments: [],
        checkingEnrollments: false,
        checkingPayments: false
      });
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/student?id=${studentToDelete._id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete student');
      }
      
      // Remove student from list
      setStudents(students.filter(s => s._id !== studentToDelete._id));
      setSuccessMessage(`${studentToDelete.name} has been successfully deleted.`);
      
      // Close confirmation modal
      setShowDeleteConfirm(false);
      setStudentToDelete(null);
    } catch (err) {
      setError('Failed to delete student. Please try again.');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.sid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white shadow-md rounded p-6">
      <h2 className="text-xl font-semibold mb-4">Students Management</h2>
      <p className="text-gray-700 mb-4">
        View and manage your student information, progress, and enrollment.
      </p>
      
      {/* Success message alert */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 relative">
          <span className="block sm:inline">{successMessage}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4"
            onClick={() => setSuccessMessage('')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
          <span className="block sm:inline">{error}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4"
            onClick={() => setError('')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}
      
      <div className="mt-6 flex flex-col md:flex-row justify-between items-center">
        <div className="relative w-full md:w-auto mb-4 md:mb-0">
          <input
            type="text"
            placeholder="Search students..."
            className="pl-10 pr-4 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-2.5">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <label htmlFor="sortBy" className="mr-2 text-sm font-medium text-gray-700">Sort by:</label>
            <select 
              id="sortBy" 
              className="border rounded-md px-3 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={sortOption}
              onChange={handleSortChange}
            >
              <option value="name">Name</option>
              <option value="createdAt">Date Added</option>
              <option value="sid">ID</option>
            </select>
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
            onClick={openAddStudentModal}
          >
            <UserPlusIcon className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">Add New Student</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Mobile View - Card Layout */}
          <div className="md:hidden mt-6 space-y-4">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <div key={student._id} className="bg-white border rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium">{student.name}</h3>
                        <p className="text-xs text-gray-500">ID: {student.sid}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <p className="truncate">{student.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Contact:</span>
                      <p>{student.contactNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <button
                      onClick={() => openEnrollmentModal(student)}
                      className="flex items-center justify-center px-3 py-1 bg-green-50 text-green-700 rounded-md text-xs"
                    >
                      <UserPlusIcon className="h-3.5 w-3.5 mr-1" />
                      Enroll
                    </button>
                    
                    <button
                      onClick={() => openPaymentModal(student)}
                      className="flex items-center justify-center px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs"
                    >
                      <CreditCardIcon className="h-3.5 w-3.5 mr-1" />
                      Payment
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={() => toggleDropdown(student._id)}
                        className="flex items-center justify-center px-3 py-1 bg-gray-50 text-gray-700 rounded-md text-xs"
                      >
                        <EllipsisVerticalIcon className="h-3.5 w-3.5" />
                        More
                      </button>
                      
                      {openDropdownId === student._id && (
                        <div 
                          ref={(el: HTMLDivElement | null) => { dropdownRefs.current[student._id] = el; }}
                          className="absolute right-0 mt-1 w-40 bg-white border rounded-md shadow-lg z-10"
                        >
                          <button 
                            onClick={() => openDetailModal(student)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <EyeIcon className="h-4 w-4 mr-2 text-gray-500" />
                            View Details
                          </button>
                          <button 
                            onClick={() => openEditModal(student)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <PencilIcon className="h-4 w-4 mr-2 text-gray-500" />
                            Edit
                          </button>
                          <button 
                            onClick={() => initiateDelete(student)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4 mr-2 text-red-500" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 mt-6">No students found</p>
            )}
          </div>

          {/* Desktop View - Table Layout */}
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.sid}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.contactNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => openEnrollmentModal(student)}
                            className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100"
                            title="Enroll in class"
                          >
                            <UserPlusIcon className="h-4 w-4 mr-1" />
                            Enroll
                          </button>
                          
                          <button 
                            onClick={() => openPaymentModal(student)}
                            className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                            title="Process payment"
                          >
                            <CreditCardIcon className="h-4 w-4 mr-1" />
                            Payment
                          </button>
                          
                          <div className="relative">
                            <button
                              onClick={() => toggleDropdown(student._id)}
                              className="flex items-center justify-center bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                            >
                              <EllipsisVerticalIcon className="h-4 w-4" />
                              <span className="ml-1">More</span>
                            </button>
                            
                            {openDropdownId === student._id && (
                              <div 
                                ref={(el: HTMLDivElement | null) => { dropdownRefs.current[student._id] = el; }}
                                className="absolute right-0 mt-1 w-40 bg-white border rounded-md shadow-lg z-10"
                              >
                                <button 
                                  onClick={() => openDetailModal(student)}
                                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <EyeIcon className="h-4 w-4 mr-2 text-gray-500" />
                                  View Details
                                </button>
                                <button 
                                  onClick={() => openEditModal(student)}
                                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <PencilIcon className="h-4 w-4 mr-2 text-gray-500" />
                                  Edit
                                </button>
                                <button 
                                  onClick={() => initiateDelete(student)}
                                  className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <TrashIcon className="h-4 w-4 mr-2 text-red-500" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No students found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Showing page {page} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className={`px-3 py-1 rounded ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className={`px-3 py-1 rounded ${page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && studentToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
            
            <h3 className="text-lg font-medium text-center mb-2">
              Delete {studentToDelete.name}?
            </h3>
            
            {/* Loading state for checks */}
            {(deletionChecks.checkingEnrollments || deletionChecks.checkingPayments) && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                <p className="ml-2 text-gray-600">Checking student records...</p>
              </div>
            )
            }
            
            {/* If there are enrollments */}
            {!deletionChecks.checkingEnrollments && deletionChecks.enrollments.length > 0 && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-yellow-700 font-medium mb-2">
                  This student is currently enrolled in {deletionChecks.enrollments.length} class(es):
                </p>
                <ul className="text-sm text-yellow-600 list-disc pl-5 space-y-1">
                  {deletionChecks.enrollments.map(enrollment => (
                    <li key={enrollment._id}>{enrollment.class.name}</li>
                  ))}
                </ul>
                <p className="text-sm text-yellow-700 mt-2">
                  The student must be unenrolled from these classes before deletion.
                </p>
              </div>
            )
            }
            
            {/* If there are pending payments */}
            {!deletionChecks.checkingPayments && deletionChecks.pendingPayments.length > 0 && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-yellow-700 font-medium mb-2">
                  This student has {deletionChecks.pendingPayments.length} pending payment(s):
                </p>
                <ul className="text-sm text-yellow-600 list-disc pl-5 space-y-1">
                  {deletionChecks.pendingPayments.map(payment => (
                    <li key={payment._id}>
                      {payment.class.name} - {getMonthName(payment.month)} {payment.academicYear} (£{payment.amount})
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-yellow-700 mt-2">
                  Deleting this student will also remove any pending payments.
                </p>
              </div>
            )
            }
            
            {/* No issues found */}
            {!deletionChecks.checkingEnrollments && 
             !deletionChecks.checkingPayments && 
             deletionChecks.enrollments.length === 0 && (
              <p className="text-gray-600 text-center mb-4">
                Are you sure you want to delete this student? This action cannot be undone.
              </p>
            )
            }
            
            <div className="flex justify-center space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setStudentToDelete(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800"
              >
                Cancel
              </button>
              
              {/* Enable delete button only if no enrollments */}
              <button
                onClick={handleDeleteStudent}
                disabled={deletionChecks.checkingEnrollments || 
                          deletionChecks.checkingPayments || 
                          deletionChecks.enrollments.length > 0 ||
                          deleteLoading}
                className={`px-4 py-2 rounded-md text-white flex items-center ${
                  deletionChecks.enrollments.length > 0 || deleteLoading ? 
                  'bg-gray-400 cursor-not-allowed' : 
                  'bg-red-600 hover:bg-red-700'
                }`}
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete Student
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )
      }
      
      {/* Other Modals */}
      <StudentDetailModal 
        student={selectedStudent} 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={() => {
          setIsDetailModalOpen(false);
          setIsEditModalOpen(true);
        }}
      />
      
      <StudentEditModal 
        student={selectedStudent}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleStudentUpdate}
      />

      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={closeAddStudentModal}
        onSuccess={handleAddStudentSuccess}
      />

      <EnrollmentModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => setIsEnrollmentModalOpen(false)}
        student={selectedStudent}
        onEnrollSuccess={handleEnrollmentSuccess}
      />

      <StudentPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        student={selectedStudent}
        onSuccess={(message) => {
          setSuccessMessage(message);
          setIsPaymentModalOpen(false);
        }}
      />
      
    </div>
  );
}

// Helper function to get month name
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}