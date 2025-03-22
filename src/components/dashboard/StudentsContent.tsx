import React, { useState, useEffect } from 'react';
import StudentDetailModal from '../students/StudentDetailModal';
import StudentEditModal from '../students/StudentEditModal';
import AddStudentModal from '../students/AddStudentModal'; // Import AddStudentModal
import EnrollmentModal from '../students/EnrollmentModal'; // Import EnrollmentModal
import { Student } from '@/types/student';

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
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false); // Add state for AddStudentModal
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchStudents();
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
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  const openEnrollmentModal = (student: Student) => {
    setSelectedStudent(student);
    setIsEnrollmentModalOpen(true);
  };

  const openAddStudentModal = () => {
    setIsAddStudentModalOpen(true); // Open AddStudentModal
  };

  const closeAddStudentModal = () => {
    setIsAddStudentModalOpen(false); // Close AddStudentModal
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
    setStudents((prevStudents) => [newStudent, ...prevStudents]); // Add new student to the list
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

  const handleEnrollmentComplete = () => {
    setSuccessMessage(`${selectedStudent?.name} has been successfully enrolled in the class.`);
    // Optionally refresh student data after enrollment
    fetchStudents();
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
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
              <option value="grade">Grade</option>
              <option value="createdAt">Date Added</option>
              <option value="sid">ID</option>
            </select>
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
            onClick={openAddStudentModal} // Attach the open modal function
          >
            Add New Student
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center my-8">{error}</div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
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
                        {student.grade || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.contactNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          onClick={() => openDetailModal(student)}
                        >
                          View
                        </button>
                        <button 
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          onClick={() => openEditModal(student)}
                        >
                          Edit
                        </button>
                        <button 
                          className="text-green-600 hover:text-green-900"
                          onClick={() => openEnrollmentModal(student)}
                        >
                          Enroll
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
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
      
      {/* Student Detail Modal */}
      <StudentDetailModal 
        student={selectedStudent} 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={() => {
          setIsDetailModalOpen(false); // Close detail modal
          setIsEditModalOpen(true);    // Open edit modal
        }}
      />
      
      {/* Student Edit Modal */}
      <StudentEditModal 
        student={selectedStudent}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleStudentUpdate}
      />

      {/* AddStudentModal */}
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={closeAddStudentModal}
        onSuccess={handleAddStudentSuccess}
      />

      {/* EnrollmentModal */}
      <EnrollmentModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => setIsEnrollmentModalOpen(false)}
        student={selectedStudent}
        onEnrollSuccess={handleEnrollmentSuccess}
      />
      
    </div>
  );
}