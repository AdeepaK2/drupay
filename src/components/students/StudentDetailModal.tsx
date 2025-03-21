import React from 'react';

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

interface StudentDetailModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void; // Add this prop to handle edit button click
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ 
  student, 
  isOpen, 
  onClose, 
  onEdit 
}) => {
  if (!isOpen || !student) return null;

  // Format date if available
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-800">Student Details</h2>
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {/* Student basic info section */}
          <div className="flex items-start mb-6">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
              {student.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold text-gray-800">{student.name}</h3>
              <p className="text-gray-600">ID: {student.sid}</p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-800 mb-2 pb-1 border-b">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-800">{student.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-gray-800">{student.contactNumber}</p>
              </div>
            </div>
          </div>
          
          {/* Parent Information */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-800 mb-2 pb-1 border-b">Parent/Guardian Information</h4>
            {student.parent ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-gray-800">{student.parent.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-800">{student.parent.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contact Number</p>
                  <p className="text-gray-800">{student.parent.contactNumber || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 italic">No parent information available</p>
            )}
          </div>
          
          {/* Payment Information */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-800 mb-2 pb-1 border-b">Payment Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="text-gray-800">{student.paymentMethod || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Admission Fee</p>
                <div className="flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${student.admissionFeeStatus?.paid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>{student.admissionFeeStatus?.paid ? 'Paid' : 'Not Paid'}</span>
                </div>
                {student.admissionFeeStatus?.paid && (
                  <>
                    <p className="text-sm text-gray-500 mt-2">Amount</p>
                    <p className="text-gray-800">${student.admissionFeeStatus?.amount || 'N/A'}</p>
                    <p className="text-sm text-gray-500 mt-2">Payment Date</p>
                    <p className="text-gray-800">{formatDate(student.admissionFeeStatus?.paidDate)}</p>
                    {student.admissionFeeStatus?.receiptNumber && (
                      <>
                        <p className="text-sm text-gray-500 mt-2">Receipt Number</p>
                        <p className="text-gray-800">{student.admissionFeeStatus?.receiptNumber}</p>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Classes */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-800 mb-2 pb-1 border-b">Enrolled Classes</h4>
            {student.classes && student.classes.length > 0 ? (
              <ul className="list-disc pl-5">
                {student.classes.map((className, index) => (
                  <li key={index} className="text-gray-800">{className}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 italic">No classes enrolled</p>
            )}
          </div>
          
          {/* Additional Notes */}
          {student.notes && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-800 mb-2 pb-1 border-b">Notes</h4>
              <p className="text-gray-800 whitespace-pre-line">{student.notes}</p>
            </div>
          )}
          
          {/* Registration Date */}
          <div>
            <p className="text-sm text-gray-500">Registered On</p>
            <p className="text-gray-800">{formatDate(student.createdAt)}</p>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="border-t p-4 flex justify-end space-x-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit Student
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailModal;