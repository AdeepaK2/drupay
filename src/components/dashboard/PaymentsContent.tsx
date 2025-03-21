'use client';

import React, { useState } from 'react';
import { PaymentByStudent } from '@/components/dashboard/payments/PaymentByStudent';
import { PaymentByClass } from '@/components/dashboard/payments/PaymentByClass';

interface PaymentOption {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export default function PaymentsContent() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleOptionClick = (optionId: string) => {
    setSelectedOption(optionId);
    setSuccess(null);
  };

  const handlePaymentSuccess = (message: string) => {
    setSuccess(message);
    // Keep the selected option to allow multiple payments
  };

  const paymentOptions: PaymentOption[] = [
    {
      id: 'byStudent',
      title: 'Receive Payment by Student',
      description: 'Search for a specific student and process their payment',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
    {
      id: 'byClass',
      title: 'Receive Payment by Class',
      description: 'Select a class and process payment for students enrolled in it',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
    }
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Receive Payment</h1>
        <p className="text-gray-600 mt-1">Choose how you want to process payments</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {paymentOptions.map(option => (
          <div 
            key={option.id}
            className={`border rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-md 
              ${selectedOption === option.id 
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                : 'border-gray-200 hover:border-blue-300'}`}
            onClick={() => handleOptionClick(option.id)}
          >
            <div className="flex items-start">
              <div className={`rounded-full p-3 mr-4 
                ${selectedOption === option.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d={option.icon}
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">{option.title}</h3>
                <p className="text-gray-600 mt-1">{option.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedOption && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              {selectedOption === 'byStudent' ? 'Student Payment' : 'Class Payment'}
            </h2>
            <button 
              onClick={() => setSelectedOption(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Change Option
            </button>
          </div>
          
          {selectedOption === 'byStudent' ? (
            <PaymentByStudent onPaymentSuccess={handlePaymentSuccess} />
          ) : (
            <PaymentByClass onPaymentSuccess={handlePaymentSuccess} />
          )}
        </div>
      )}
    </div>
  );
}