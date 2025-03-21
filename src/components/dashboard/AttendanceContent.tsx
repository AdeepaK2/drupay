import React from 'react';

export default function AttendanceContent() {
  return (
    <div className="bg-white shadow-md rounded p-6">
      <h2 className="text-xl font-semibold mb-4">Attendance Management</h2>
      <p className="text-gray-700 mb-4">
        Track and manage student attendance records.
      </p>
      
      <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <select className="border rounded p-2 w-full md:w-auto">
            <option value="">Select Class</option>
            <option value="math">Mathematics 101</option>
            <option value="physics">Physics Advanced</option>
          </select>
          <input 
            type="date" 
            className="border rounded p-2 w-full md:w-auto"
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md w-full md:w-auto">
          Take Attendance
        </button>
      </div>
      
      <div className="mt-6">
        <h3 className="font-medium mb-4">Recent Attendance Records</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">Mar 20, 2025</td>
                <td className="px-6 py-4 whitespace-nowrap">Mathematics 101</td>
                <td className="px-6 py-4 whitespace-nowrap">22</td>
                <td className="px-6 py-4 whitespace-nowrap">2</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-indigo-600 hover:text-indigo-900">View</button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">Mar 19, 2025</td>
                <td className="px-6 py-4 whitespace-nowrap">Physics Advanced</td>
                <td className="px-6 py-4 whitespace-nowrap">16</td>
                <td className="px-6 py-4 whitespace-nowrap">2</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-indigo-600 hover:text-indigo-900">View</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}