import React, { useState } from 'react';
import { Student } from '@/types/student';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: Student) => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Student form state
  const [studentData, setStudentData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    grade: '',
    paymentMethod: 'Cash', // Default payment method
    parent: {
      name: '',
      email: '',
      contactNumber: ''
    },
    admissionFeeStatus: {
      paid: false,
      amount: 0,
      paidDate: ''
    }
  });

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      
      if (parent === 'parent') {
        setStudentData(prev => ({
          ...prev,
          parent: {
            ...prev.parent,
            [child]: value
          }
        }));
      } else if (parent === 'admissionFeeStatus') {
        setStudentData(prev => ({
          ...prev,
          admissionFeeStatus: {
            ...prev.admissionFeeStatus,
            [child]: value
          }
        }));
      }
    } else {
      setStudentData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle fee status change
  const handleFeeStatusChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const propertyName = name.replace('admissionFeeStatus.', '');
    
    setStudentData(prev => ({
      ...prev,
      admissionFeeStatus: {
        ...prev.admissionFeeStatus,
        [propertyName]: type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked 
          : (propertyName === 'amount' ? parseFloat(value) : value)
      }
    }));
  };
  
  // Go to next step
  const goToNextStep = () => {
    if (validateCurrentStep()) {
      setStep(prev => prev + 1);
      setError('');
    }
  };
  
  // Go to previous step
  const goToPreviousStep = () => {
    setStep(prev => prev - 1);
    setError('');
  };
  
  // Validate current step inputs
  const validateCurrentStep = () => {
    setError('');
    
    if (step === 1) {
      // Validate student details
      if (!studentData.name || !studentData.email || !studentData.contactNumber) {
        setError('Please fill in all required fields');
        return false;
      }
      
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(studentData.email)) {
        setError('Please enter a valid email address');
        return false;
      }
    } else if (step === 2) {
      // Validate parent details
      if (!studentData.parent.name || !studentData.parent.contactNumber) {
        setError('Please provide at least parent name and contact number');
        return false;
      }
      
      // If parent email is provided, validate it
      if (studentData.parent.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentData.parent.email)) {
        setError('Please enter a valid parent email address');
        return false;
      }
    }
    
    return true;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add student');
      }
      
      const newStudent = await response.json();
      onSuccess(newStudent);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while adding the student');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Close modal and reset state
  const handleClose = () => {
    setStep(1);
    setStudentData({
      name: '',
      email: '',
      contactNumber: '',
      grade: '',
      paymentMethod: 'Cash',
      parent: {
        name: '',
        email: '',
        contactNumber: ''
      },
      admissionFeeStatus: {
        paid: false,
        amount: 0,
        paidDate: ''
      }
    });
    setError('');
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {step === 1 ? "Add New Student" : 
                   step === 2 ? "Parent Information" : 
                   "Payment Information"}
                </h3>
                
                {/* Progress bar */}
                <div className="mt-4 mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span className={step >= 1 ? "text-blue-600 font-medium" : ""}>Student</span>
                    <span className={step >= 2 ? "text-blue-600 font-medium" : ""}>Parent</span>
                    <span className={step >= 3 ? "text-blue-600 font-medium" : ""}>Payment</span>
                  </div>
                </div>
                
                {/* Error message */}
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  {/* Step 1: Student Details */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={studentData.name}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={studentData.email}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">
                          Contact Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="contactNumber"
                          name="contactNumber"
                          value={studentData.contactNumber}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
                          Grade
                        </label>
                        <input
                          type="text"
                          id="grade"
                          name="grade"
                          value={studentData.grade}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Step 2: Parent Details */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="parent.name" className="block text-sm font-medium text-gray-700">
                          Parent Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="parent.name"
                          name="parent.name"
                          value={studentData.parent.name}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="parent.email" className="block text-sm font-medium text-gray-700">
                          Parent Email
                        </label>
                        <input
                          type="email"
                          id="parent.email"
                          name="parent.email"
                          value={studentData.parent.email}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="parent.contactNumber" className="block text-sm font-medium text-gray-700">
                          Parent Contact Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="parent.contactNumber"
                          name="parent.contactNumber"
                          value={studentData.parent.contactNumber}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Step 3: Payment Information */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">
                          Payment Method <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="paymentMethod"
                          name="paymentMethod"
                          value={studentData.paymentMethod}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        >
                          <option value="Cash">Cash</option>
                          <option value="Invoice">Invoice</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="admissionFeeStatus.paid"
                          name="admissionFeeStatus.paid"
                          checked={studentData.admissionFeeStatus.paid}
                          onChange={handleFeeStatusChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="admissionFeeStatus.paid" className="ml-2 block text-sm text-gray-700">
                          Admission Fee Paid
                        </label>
                      </div>
                      
                      {studentData.admissionFeeStatus.paid && (
                        <>
                          <div>
                            <label htmlFor="admissionFeeStatus.amount" className="block text-sm font-medium text-gray-700">
                              Amount Paid
                            </label>
                            <input
                              type="number"
                              id="admissionFeeStatus.amount"
                              name="admissionFeeStatus.amount"
                              value={studentData.admissionFeeStatus.amount}
                              onChange={handleFeeStatusChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="admissionFeeStatus.paidDate" className="block text-sm font-medium text-gray-700">
                              Payment Date
                            </label>
                            <input
                              type="date"
                              id="admissionFeeStatus.paidDate"
                              name="admissionFeeStatus.paidDate"
                              value={studentData.admissionFeeStatus.paidDate}
                              onChange={handleFeeStatusChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {step < 3 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Add Student'
                )}
              </button>
            )}
            
            {step > 1 && (
              <button
                type="button"
                onClick={goToPreviousStep}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Back
              </button>
            )}
            
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;