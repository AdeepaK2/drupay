import React from 'react';

export default function CentersContent() {
  return (
    <div className="bg-white shadow-md rounded p-6">
      <h2 className="text-xl font-semibold mb-4">Learning Centers</h2>
      <p className="text-gray-700 mb-4">
        Manage your educational centers and facility information.
      </p>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden">
          <div className="h-40 bg-gray-200"></div>
          <div className="p-4">
            <h3 className="font-medium text-lg">Main Campus</h3>
            <p className="text-gray-600 mt-1">123 Education Ave, City</p>
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              10 Classrooms
            </div>
            <div className="mt-4 flex justify-end">
              <button className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-sm">Manage</button>
            </div>
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="h-40 bg-gray-200"></div>
          <div className="p-4">
            <h3 className="font-medium text-lg">Downtown Branch</h3>
            <p className="text-gray-600 mt-1">456 Learning St, City</p>
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              6 Classrooms
            </div>
            <div className="mt-4 flex justify-end">
              <button className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-sm">Manage</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}