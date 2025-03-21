import React from 'react';

export default function MessagesContent() {
  return (
    <div className="bg-white shadow-md rounded p-6">
      <h2 className="text-xl font-semibold mb-4">Messages</h2>
      <p className="text-gray-700 mb-4">
        Communicate with students, parents, and staff.
      </p>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 border-r pr-4">
          <div className="mb-4">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md w-full">
              New Message
            </button>
          </div>
          <div className="space-y-2">
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 cursor-pointer">
              <div className="flex justify-between items-center">
                <span className="font-medium">John Doe</span>
                <span className="text-xs text-gray-500">2m ago</span>
              </div>
              <p className="text-sm text-gray-600 truncate">About the upcoming exams schedule...</p>
            </div>
            <div className="p-3 bg-white rounded-lg border cursor-pointer">
              <div className="flex justify-between items-center">
                <span className="font-medium">Jane Smith</span>
                <span className="text-xs text-gray-500">1h ago</span>
              </div>
              <p className="text-sm text-gray-600 truncate">Question regarding the homework assignment...</p>
            </div>
            <div className="p-3 bg-white rounded-lg border cursor-pointer">
              <div className="flex justify-between items-center">
                <span className="font-medium">Admin</span>
                <span className="text-xs text-gray-500">1d ago</span>
              </div>
              <p className="text-sm text-gray-600 truncate">New announcement for all teachers...</p>
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="bg-gray-50 p-4 rounded-lg h-[400px] flex flex-col">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Conversation with John Doe</h3>
                <span className="text-xs text-gray-500">Student - Mathematics 101</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs mr-2">JD</div>
                  <div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%]">
                    <p className="text-sm">Hello, I had a question about the upcoming exams schedule. When will we get the detailed timetable?</p>
                    <span className="text-xs text-gray-500">10:30 AM</span>
                  </div>
                </div>
                <div className="flex items-start flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs ml-2">ME</div>
                  <div className="bg-indigo-100 p-3 rounded-lg shadow-sm max-w-[80%]">
                    <p className="text-sm">Hi John, we'll be posting the exam schedule by tomorrow. Everyone will receive an email notification.</p>
                    <span className="text-xs text-gray-500">10:34 AM</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-r-md">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}