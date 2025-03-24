'use client';

import React, { useState } from 'react';
import { PaymentByClass } from '@/components/dashboard/payments/PaymentByClass';
import { BookOpenIcon } from '@heroicons/react/24/outline';

interface PaymentOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function PaymentsContent() {
  const [selectedOption, setSelectedOption] = useState<string>('byClass');
  const [success, setSuccess] = useState<string | null>(null);

  const handlePaymentSuccess = (message: string) => {
    setSuccess(message);
    // Keep the selected option to allow multiple payments
  };

  const paymentOptions: PaymentOption[] = [
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
        <p className="text-gray-600 mt-1">Process payments for classes</p>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {success}
        </div>
      )}

      <div className={success ? "mt-4" : ""}>
        <PaymentByClass onPaymentSuccess={handlePaymentSuccess} />
      </div>
    </div>
  );
}