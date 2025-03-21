import React, { useState, useEffect } from 'react';

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
    paidDate?: string; // Change to match schema
    receiptNumber?: string; // Add this field from schema
  };
  paymentMethod?: 'Cash' | 'Invoice'; // Restrict to schema values
  notes?: string;
  joinedDate?: string;
}

interface StudentEditModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStudent: Student) => void;
}

const StudentEditModal: React.FC<StudentEditModalProps> = ({ student, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Initialize form data when student prop changes
  useEffect(() => {
    if (student) {
      setFormData({ ...student });
    }
  }, [student]);

  if (!isOpen || !formData) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle nested fields
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => {
        if (!prev) return prev;
        // Safely get the parent object or default to empty object
        const parentObj = (prev[parent as keyof Student] || {}) as Record<string, any>;
        return {
          ...prev,
          [parent]: {
            ...parentObj,
            [child]: value
          }
        };
      });
    } else {
      setFormData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [name]: value
        };
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (name === 'admissionFeeStatus.paid') {
      setFormData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          admissionFeeStatus: {
            ...prev.admissionFeeStatus,
            paid: checked
          }
        };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Create a copy of the data for submission
      let dataToSubmit = { ...formData };
      
      // Format date properly if it exists - fix field name to match schema
      if (dataToSubmit.admissionFeeStatus?.paidDate) {
        // If it's already a date string in ISO format, keep it as is
        // Otherwise, ensure it's properly formatted
        if (!dataToSubmit.admissionFeeStatus.paidDate.includes('T')) {
          const dateValue = new Date(dataToSubmit.admissionFeeStatus.paidDate);
          if (!isNaN(dateValue.getTime())) {
            dataToSubmit = {
              ...dataToSubmit,
              admissionFeeStatus: {
                ...dataToSubmit.admissionFeeStatus,
                paidDate: dateValue.toISOString()
              }
            };
          }
        }
      }
      // For backward compatibility - handle the "date" field if it exists
      else if ((dataToSubmit.admissionFeeStatus as any)?.date) {
        const dateValue = new Date((dataToSubmit.admissionFeeStatus as any).date);
        if (!isNaN(dateValue.getTime())) {
          // Extract all fields except 'date' using destructuring
          const { date, ...restAdmissionFields } = dataToSubmit.admissionFeeStatus as any;
          
          dataToSubmit = {
            ...dataToSubmit,
            admissionFeeStatus: {
              ...restAdmissionFields,
              paidDate: dateValue.toISOString() // Convert to the correct field name
            }
          };
        }
      }
      
      console.log('Sending updated student data:', dataToSubmit);
      
      const response = await fetch(`/api/student`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update student');
      }
      
      const updatedData = await response.json();
      console.log('Response from server:', updatedData);
      
      // Make sure we're passing the correct structure to onSave
      if (updatedData.student) {
        onSave(updatedData.student);
      } else {
        onSave(updatedData); // Fallback if the API doesn't return a nested student object
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating student');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-800">Edit Student</h2>
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
            disabled={loading}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 p-3 rounded-md border border-red-200">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Basic Information */}
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Basic Information</h3>
              <hr className="mb-3" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <input
                type="text"
                value={formData.sid}
                className="w-full border rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Student ID cannot be changed</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
                className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod || ''}
                onChange={handleInputChange}
                className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Payment Method</option>
                <option value="Cash">Cash</option>
                <option value="Invoice">Invoice</option>
              </select>
            </div>
            
            {/* Parent Information */}
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">Parent/Guardian Information</h3>
              <hr className="mb-3" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
              <input
                type="text"
                name="parent.name"
                value={formData.parent?.name || ''}
                onChange={handleInputChange}
                className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
              <input
                type="email"
                name="parent.email"
                value={formData.parent?.email || ''}
                onChange={handleInputChange}
                className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Contact</label>
              <input
                type="text"
                name="parent.contactNumber"
                value={formData.parent?.contactNumber || ''}
                onChange={handleInputChange}
                className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {/* Admission Fee Status */}
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">Admission Fee Status</h3>
              <hr className="mb-3" />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="admission-paid"
                name="admissionFeeStatus.paid"
                checked={formData.admissionFeeStatus?.paid || false}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="admission-paid" className="ml-2 block text-sm text-gray-700">
                Admission Fee Paid
              </label>
            </div>
            
            {formData.admissionFeeStatus?.paid && (
              <>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                  <input
                    type="number"
                    name="admissionFeeStatus.amount"
                    value={formData.admissionFeeStatus?.amount || ''}
                    onChange={handleInputChange}
                    className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    name="admissionFeeStatus.paidDate"
                    value={formData.admissionFeeStatus?.paidDate ? formData.admissionFeeStatus.paidDate.split('T')[0] : ''}
                    onChange={handleInputChange}
                    className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
                  <input
                    type="text"
                    name="admissionFeeStatus.receiptNumber"
                    value={formData.admissionFeeStatus?.receiptNumber || ''}
                    onChange={handleInputChange}
                    className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            )}
            
            {/* Notes */}
            <div className="col-span-2">
              <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">Additional Notes</h3>
              <hr className="mb-3" />
              
              <textarea
                name="notes"
                value={formData.notes || ''}
                onChange={handleInputChange}
                rows={4}
                className="w-full border rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Add any additional notes about this student..."
              />
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="border-t pt-4 mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentEditModal;