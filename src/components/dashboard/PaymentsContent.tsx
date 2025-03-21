'use client';

import React, { useState } from 'react';
import { PaymentByStudent } from '@/components/dashboard/payments/PaymentByStudent';
import { PaymentByClass } from '@/components/dashboard/payments/PaymentByClass';
import { UserIcon, BookOpenIcon } from '@heroicons/react/24/outline';

interface PaymentOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
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
      title: 'By Student',
      description: 'Process payment for a specific student',
      icon: <UserIcon className="w-5 h-5" />
    },
    {
      id: 'byClass',
      title: 'By Class',
      description: 'Process payments for an entire class',
      icon: <BookOpenIcon className="w-5 h-5" />
    }
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Receive Payment</h1>
        <p className="text-gray-600 mt-1">Choose how you want to process payments</p>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {success}
        </div>
      )}

      {/* Compact option buttons */}
      <div className="flex space-x-4 mb-6">
        {paymentOptions.map(option => (
          <button 
            key={option.id}
            className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-200
              ${selectedOption === option.id 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}
            onClick={() => handleOptionClick(option.id)}
          >
            <span className={`mr-2 ${selectedOption === option.id ? 'text-blue-600' : 'text-gray-600'}`}>
              {option.icon}
            </span>
            <span className="font-medium">{option.title}</span>
          </button>
        ))}
      </div>

      {selectedOption && (
        <div className={success ? "mt-4" : ""}>
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