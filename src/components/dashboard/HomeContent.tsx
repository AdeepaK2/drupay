import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { format, addMonths, subMonths } from 'date-fns';

ChartJS.register(ArcElement, Tooltip, Legend);

interface HomeContentProps {
  user: any; // Replace with proper user type from your auth context
}

interface PaymentSummary {
  totalReceived: number;
  totalPending: number;
  byCash: number;
  byInvoice: number;
}

export default function HomeContent({ user }: HomeContentProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    totalReceived: 0,
    totalPending: 0,
    byCash: 0,
    byInvoice: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [duePayments, setDuePayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments'>('overview');

  const formatMonth = (date: Date) => {
    return format(date, 'MMMM yyyy');
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  const fetchPaymentData = async () => {
    setIsLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // JavaScript months are 0-indexed
      
      // Fetch payment summary
      const summaryResponse = await fetch(`/api/payment?year=${year}&month=${month}&summary=true`);
      if (summaryResponse.ok) {
        const data = await summaryResponse.json();
        setPaymentSummary({
          totalReceived: data.totalReceived || 0,
          totalPending: data.totalPending || 0,
          byCash: data.byCash || 0,
          byInvoice: data.byInvoice || 0,
        });
        
        // Use both existing pending payments and missing payments
        const pendingResponse = await fetch(`/api/payment?year=${year}&month=${month}&status=PENDING`);
        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json();
          const allDue = [
            ...(pendingData.payments || []),
            ...(data.missingPayments || [])
          ];
          setDuePayments(allDue);
        } else {
          setDuePayments(data.missingPayments || []);
        }
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, [currentMonth]);

  const paymentMethodChartData = {
    labels: ['Cash', 'Invoice'],
    datasets: [
      {
        data: [paymentSummary.byCash, paymentSummary.byInvoice],
        backgroundColor: ['#4ade80', '#60a5fa'],
        borderColor: ['#16a34a', '#2563eb'],
        borderWidth: 1,
      },
    ],
  };

  const paymentStatusChartData = {
    labels: ['Received', 'Pending'],
    datasets: [
      {
        data: [paymentSummary.totalReceived, paymentSummary.totalPending],
        backgroundColor: ['#4ade80', '#fbbf24'],
        borderColor: ['#16a34a', '#d97706'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-4 pb-16 md:pb-0"> {/* Added padding bottom for mobile to account for tabs */}
      {/* Hero card with quick stats */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl p-5 text-white shadow-lg">
        <h2 className="text-xl font-bold mb-2">Welcome back</h2>
        <p className="text-indigo-100 mb-4 text-sm">
          Here's your financial summary for {formatMonth(currentMonth)}
        </p>
        
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">Total Revenue</h3>
          <div className="flex space-x-2">
            <button 
              onClick={handlePreviousMonth}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition"
              aria-label="Previous month"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition"
              aria-label="Next month"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="text-3xl font-bold mb-5">
          £{(paymentSummary.totalReceived + paymentSummary.totalPending).toFixed(2)}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <span className="block text-xs text-indigo-100">Received</span>
            <span className="font-bold text-lg">£{paymentSummary.totalReceived.toFixed(2)}</span>
          </div>
          <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <span className="block text-xs text-indigo-100">Pending</span>
            <span className="font-bold text-lg">£{paymentSummary.totalPending.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Mobile Friendly */}
      <div className="bg-white rounded-xl overflow-hidden shadow-md mb-4">
        <div className="flex border-b">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`flex-1 py-3 text-center ${activeTab === 'overview' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-gray-600'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('payments')} 
            className={`flex-1 py-3 text-center ${activeTab === 'payments' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-gray-600'}`}
          >
            Payments
            {duePayments.length > 0 && (
              <span className="ml-1.5 bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded-full">
                {duePayments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' ? (
            <>
              {/* Payment Method Card */}
              <div className="bg-white rounded-xl p-5 shadow-md">
                <h3 className="text-lg font-medium mb-4">Payment Methods</h3>
                <div className="flex flex-col md:flex-row items-stretch md:items-center">
                  <div className="w-full md:w-1/2 h-52 flex justify-center items-center">
                    <div className="w-full max-w-[200px]">
                      <Pie 
                        data={paymentMethodChartData} 
                        options={{ 
                          maintainAspectRatio: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: {
                                  size: 12
                                }
                              }
                            }
                          }
                        }} 
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 mt-4 md:mt-0 flex flex-col justify-center">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                        <p className="text-sm text-green-800 font-medium">Cash</p>
                        <p className="text-2xl font-bold text-gray-800">£{paymentSummary.byCash.toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                        <p className="text-sm text-blue-800 font-medium">Invoice</p>
                        <p className="text-2xl font-bold text-gray-800">£{paymentSummary.byInvoice.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Due Payments Card */}
              <div className="bg-white rounded-xl p-5 shadow-md overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Due Payments</h3>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                    {duePayments.length} pending
                  </span>
                </div>
                
                {duePayments.length > 0 ? (
                  <div className="space-y-3 overflow-y-auto max-h-[500px] -mx-5 px-5 pb-2">
                    {duePayments.map((payment: any, index) => (
                      <div 
                        key={payment._id || `missing-${index}`} 
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200 shadow-sm"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-sm">{payment.student?.name}</h4>
                            <p className="text-xs text-gray-500">{payment.class?.name}</p>
                          </div>
                          <span className="font-bold text-lg">£{payment.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">
                            Due: {payment.dueDate ? format(new Date(payment.dueDate), 'dd MMM yyyy') : 'Not set'}
                          </span>
                          {payment._id ? (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">
                              Payment Due
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 font-medium">
                              No Record
                            </span>
                          )}
                        </div>
                        <button className="w-full mt-2 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium transition">
                          Record Payment
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center bg-gray-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-600 font-medium">No pending payments for this month</p>
                    <p className="text-gray-500 text-sm mt-1">All payments are up to date</p>
                  </div>
                )}
              </div>

              {/* Payment Status Summary */}
              <div className="bg-white rounded-xl p-5 shadow-md">
                <h3 className="text-lg font-medium mb-4">Payment Status</h3>
                <div className="flex flex-col md:flex-row items-center">
                  <div className="w-full md:w-1/2 h-48 flex justify-center items-center">
                    <div className="w-full max-w-[200px]">
                      <Pie 
                        data={paymentStatusChartData}
                        options={{ 
                          maintainAspectRatio: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                usePointStyle: true,
                                padding: 15,
                                font: {
                                  size: 12
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 mt-4 md:mt-0">
                    <div className="space-y-3">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="flex justify-between">
                          <div>
                            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                            <span className="text-sm font-medium">Received</span>
                          </div>
                          <span className="font-bold">{paymentSummary.totalReceived > 0 ? Math.round((paymentSummary.totalReceived / (paymentSummary.totalReceived + paymentSummary.totalPending)) * 100) : 0}%</span>
                        </div>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <div className="flex justify-between">
                          <div>
                            <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                            <span className="text-sm font-medium">Pending</span>
                          </div>
                          <span className="font-bold">{paymentSummary.totalPending > 0 ? Math.round((paymentSummary.totalPending / (paymentSummary.totalReceived + paymentSummary.totalPending)) * 100) : 0}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}