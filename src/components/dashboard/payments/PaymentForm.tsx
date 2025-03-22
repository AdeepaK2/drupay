'use client';

import React, { useState, useEffect } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface PaymentFormProps {
  type: 'student' | 'class';
  entityId: string;
  entityName: string;
  entityEmail?: string;
  defaultAmount: number;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function PaymentForm({
  type,
  entityId,
  entityName,
  entityEmail = '',
  defaultAmount,
  onSuccess,
  onCancel
}: PaymentFormProps) {
  const [paymentDetails, setPaymentDetails] = useState({
    amount: defaultAmount,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    paymentMethod: 'Cash',
    receiptNumber: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState<boolean>(false);

  // Helper function for haptic feedback
  const triggerVibration = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // Focus on amount input when component loads
  useEffect(() => {
    const amountInput = document.getElementById('payment-amount');
    if (amountInput) {
      amountInput.focus();
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({
      ...prev,
      [name]: name === 'amount' || name === 'month' || name === 'year' 
        ? Number(value) 
        : value
    }));
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerVibration(); // Provide haptic feedback
    
    if (!paymentDetails.amount) {
      setPaymentError('Please enter payment amount');
      return;
    }

    try {
      setSubmitting(true);
      setPaymentError(null);
      
      const paymentData = {
        student: type === 'student' ? {
          sid: entityId,
          name: entityName,
          email: entityEmail,
        } : { sid: "", name: "", email: "" },
        class: type === 'class' ? {
          classId: entityId,
          name: entityName,
        } : { classId: "", name: "" },
        academicYear: paymentDetails.year,
        month: paymentDetails.month,
        amount: paymentDetails.amount,
        paymentMethod: paymentDetails.paymentMethod,
        receiptNumber: paymentDetails.receiptNumber,
        notes: paymentDetails.notes,
        status: 'PAID'
      };
      
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }
      
      await response.json();
      
      // Show success animation
      setShowPaymentSuccess(true);
      
      // Slight delay before calling the success callback
      setTimeout(() => {
        onSuccess(); // Call the success callback passed from parent
      }, 800);
      
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to process payment');
      console.error('Error processing payment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // If showing payment success animation
  if (showPaymentSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-success-appear rounded-full bg-green-100 p-6 mb-4">
          <svg className="h-16 w-16 text-green-600 animate-success-check" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Payment Successful</h3>
        <p className="text-gray-600">Your payment has been processed</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Process Payment</h2>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-sm text-gray-700">
              <span className="font-medium">For:</span> {entityName}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{type === 'student' ? 'Student ID:' : 'Class ID:'}</span> {entityId}
            </p>
          </div>
          
          {paymentError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start">
              <ExclamationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{paymentError}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmitPayment} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (£)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">£</span>
                </div>
                <input
                  id="payment-amount"
                  type="number"
                  inputMode="decimal"
                  name="amount"
                  value={paymentDetails.amount}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  min={0}
                  step={0.01}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  name="month"
                  value={paymentDetails.month}
                  onChange={handleInputChange}
                  className="block w-full pl-3 pr-10 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  required
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  name="year"
                  value={paymentDetails.year}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={2020}
                  max={2050}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                name="paymentMethod"
                value={paymentDetails.paymentMethod}
                onChange={handleInputChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                required
              >
                <option value="Cash">Cash</option>
                <option value="Invoice">Invoice</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receipt Number (Optional)
              </label>
              <input
                type="text"
                name="receiptNumber"
                value={paymentDetails.receiptNumber}
                onChange={handleInputChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter receipt number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={paymentDetails.notes}
                onChange={handleInputChange}
                rows={3}
                className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any additional notes here"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {onCancel && (
                <button
                  type="button"
                  onClick={() => {
                    triggerVibration();
                    onCancel();
                  }}
                  className="w-full sm:w-auto flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 active:bg-gray-300"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto flex-1 flex justify-center items-center py-3 px-6 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:bg-blue-800 disabled:opacity-70"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : 'Process Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Add these CSS animations to your global styles or component
// @keyframes success-appear {
//   from { transform: scale(0.8); opacity: 0; }
//   to { transform: scale(1); opacity: 1; }
// }
// 
// @keyframes success-check {
//   from { stroke-dashoffset: 66; }
//   to { stroke-dashoffset: 0; }
// }
// 
// .animate-success-appear {
//   animation: success-appear 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
// }
// 
// .animate-success-check {
//   stroke-dasharray: 66;
//   stroke-dashoffset: 66;
//   animation: success-check 0.8s cubic-bezier(0.65, 0, 0.45, 1) forwards;
//   animation-delay: 0.2s;
// }