'use client';

import React, { useState } from 'react';

interface PaymentFormProps {
  type: 'student' | 'class';
  entityId: string;
  entityName: string;
  entityEmail?: string;
  defaultAmount: number;
  onSuccess: () => void;
}

export function PaymentForm({
  type,
  entityId,
  entityName,
  entityEmail = '',
  defaultAmount,
  onSuccess
}: PaymentFormProps) {
  const [paymentDetails, setPaymentDetails] = useState({
    amount: defaultAmount,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    paymentMethod: 'Cash',
    receiptNumber: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      
      const result = await response.json();
      onSuccess(); // Call the success callback passed from parent
      
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

  return (
    <form onSubmit={handleSubmitPayment} className="mt-8 border-t pt-6">
      <h3 className="text-lg font-medium text-gray-800 mb-2">Payment Details</h3>
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Processing payment for: <span className="font-medium text-gray-800">{entityName}</span> ({type === 'student' ? 'Student ID' : 'Class ID'}: {entityId})
        </p>
      </div>
      
      {paymentError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {paymentError}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Month
          </label>
          <select
            name="month"
            value={paymentDetails.month}
            onChange={handleInputChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            required
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <input
            type="number"
            name="year"
            value={paymentDetails.year}
            onChange={handleInputChange}
            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            min={2020}
            max={2050}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="amount"
              value={paymentDetails.amount}
              onChange={handleInputChange}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
              min={0}
              step={0.01}
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
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            required
          >
            <option value="Cash">Cash</option>
            <option value="Invoice">Invoice</option>
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
            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            placeholder="Enter receipt number"
          />
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
  );
}