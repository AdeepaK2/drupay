import React from 'react';

interface HomeContentProps {
  user: any; // Replace with proper user type from your auth context
}

export default function HomeContent({ user }: HomeContentProps) {
  return (
    <div className="bg-white shadow-md rounded p-6">
      <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
      <p className="text-gray-700 mb-4">
        Welcome to your dashboard! You can manage your classes, students, centers, and more from the navigation menu.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="font-medium text-blue-700 mb-2">Classes</h3>
          <p className="text-gray-600">Manage your teaching schedule and class details</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <h3 className="font-medium text-green-700 mb-2">Students</h3>
          <p className="text-gray-600">View and manage your student information</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
          <h3 className="font-medium text-purple-700 mb-2">Messages</h3>
          <p className="text-gray-600">Communicate with students and staff</p>
        </div>
      </div>
      
      <div className="mt-6 p-3 bg-gray-50 rounded-md">
        <h3 className="font-medium mb-2">Your Account Details</h3>
        <p><span className="font-medium">Email:</span> {user?.email}</p>
        <p><span className="font-medium">User ID:</span> {user?._id}</p>
      </div>
    </div>
  );
}