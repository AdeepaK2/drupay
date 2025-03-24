'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSwipeable } from 'react-swipeable';

// Define Center interface
interface Center {
  _id: string;
  cid: number;
  name: string;
  location: string;
  admissionFee: number;
}

export default function CentersContent() {
  const router = useRouter();
  const [centers, setCenters] = useState<Center[]>([]);
  const [classCounts, setClassCounts] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    location: "",
    admissionFee: 0,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // More distinct background colors for visual differentiation
  const bgColors = [
    "bg-blue-200",
    "bg-purple-200",
    "bg-green-200",
    "bg-pink-200",
    "bg-yellow-200",
    "bg-indigo-200",
    "bg-red-200",
    "bg-cyan-200",
    "bg-amber-200",
    "bg-emerald-200",
  ];

  // Matching text colors for headers
  const textColors = [
    "text-blue-700",
    "text-purple-700",
    "text-green-700",
    "text-pink-700",
    "text-yellow-700",
    "text-indigo-700",
    "text-red-700",
    "text-cyan-700",
    "text-amber-700",
    "text-emerald-700",
  ];

  // Helper function for haptic feedback
  const triggerVibration = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    triggerVibration();
    
    try {
      await fetchCenters();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedDown: (eventData) => {
      if (eventData.initial[1] < 60) {
        handleRefresh();
      }
    },
    delta: 50,
    preventScrollOnSwipe: false,
    trackMouse: false
  });

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      setLoading(true);

      // Fetch all centers
      const response = await fetch("/api/center");

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Check content type to ensure we're getting JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format. Expected JSON.");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch centers");
      }

      setCenters(result.data);

      // Fetch class counts in a single optimized call
      await fetchAllClassCounts();
    } catch (err: any) {
      setError(err.message || "An error occurred");
      console.error("Center fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Optimized method to fetch all class counts at once
  const fetchAllClassCounts = async () => {
    try {
      const classResponse = await fetch("/api/center/counts");

      if (!classResponse.ok) {
        throw new Error(`API error: ${classResponse.status} ${classResponse.statusText}`);
      }

      const counts = await classResponse.json();
      setClassCounts(counts);
    } catch (err: any) {
      console.error("Error fetching class counts:", err);
    }
  };

  const handleManageClick = (cid: number) => {
    triggerVibration();
    router.push(`/${cid}`);
  };

  const handleEditClick = (center: Center) => {
    triggerVibration();
    setSelectedCenter(center);
    setEditForm({
      name: center.name,
      location: center.location,
      admissionFee: center.admissionFee,
    });
    setIsEditModalOpen(true);
    setUpdateError(null);
  };

  const closeModal = () => {
    triggerVibration();
    setIsEditModalOpen(false);
    setSelectedCenter(null);
    setUpdateError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: name === "admissionFee" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerVibration();

    if (!selectedCenter) return;

    try {
      setIsUpdating(true);
      setUpdateError(null);

      const response = await fetch(`/api/center?cid=${selectedCenter.cid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Error ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      // Update the centers state with the updated center
      setCenters((prevCenters) =>
        prevCenters.map((center) =>
          center.cid === selectedCenter.cid ? result.data : center
        )
      );

      // Close the modal
      closeModal();
    } catch (err: any) {
      setUpdateError(err.message || "Failed to update center");
      console.error("Update error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
        <h2 className="text-xl font-semibold mb-4">Learning Centers</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
        <h2 className="text-xl font-semibold mb-4">Learning Centers</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <p className="mb-2">Error: {error}</p>
          <div className="text-xs mb-2">
            If you're seeing a message about invalid JSON or DOCTYPE, your API
            server might not be running correctly.
          </div>
          <button
            onClick={() => {
              triggerVibration();
              window.location.reload();
            }}
            className="mt-3 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-md active:bg-red-700 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-4 sm:p-6" {...swipeHandlers}>
      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="flex justify-center items-center pb-4">
          <div className="h-6 w-6 border-2 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
      )}
      
      <h2 className="text-xl font-semibold mb-2">Learning Centers</h2>
      <p className="text-gray-700 mb-4">
        Manage your educational centers and facility information.
      </p>

      {centers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No centers found. Please add a center to get started.
          </p>
          <button
            onClick={() => triggerVibration()}
            className="mt-4 px-5 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 active:bg-indigo-800"
          >
            Add New Center
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {centers.map((center, index) => (
            <div
              key={center._id}
              className="border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            >
              <div
                className={`${bgColors[index % bgColors.length]} p-6 relative`}
              >
                <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-full px-3 py-1 text-sm font-medium">
                  Center #{center.cid}
                </div>
                <div className="h-24 flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-white opacity-80"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="p-5">
                <h3
                  className={`font-bold text-lg ${
                    textColors[index % textColors.length]
                  }`}
                >
                  {center.name}
                </h3>
                <p className="text-gray-600 mt-2">{center.location}</p>
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex items-center text-sm">
                    <svg
                      className="h-5 w-5 mr-1 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span className="font-medium">
                      {classCounts[center.cid] || 0}
                    </span>{" "}
                    Classrooms
                  </div>
                  <div className="text-sm text-gray-500">
                    ${center.admissionFee} admission fee
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleManageClick(center.cid)}
                    className="flex-1 py-3 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors"
                  >
                    Manage
                  </button>

                  <button
                    onClick={() => handleEditClick(center)}
                    className="flex-1 py-3 px-4 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add center floating action button for mobile */}
      <div className="md:hidden fixed right-4 bottom-20">
        <button 
          onClick={() => triggerVibration()}
          className="h-14 w-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center active:bg-indigo-700"
          aria-label="Add new center"
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {/* Edit Modal - adapted for mobile */}
      {isEditModalOpen && selectedCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h3 className="text-xl font-semibold">
                Edit Center #{selectedCenter.cid}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-5">
              {updateError && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
                  {updateError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="block text-gray-700 text-sm font-medium mb-2"
                    htmlFor="name"
                  >
                    Center Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={editForm.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label
                    className="block text-gray-700 text-sm font-medium mb-2"
                    htmlFor="location"
                  >
                    Location
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={editForm.location}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label
                    className="block text-gray-700 text-sm font-medium mb-2"
                    htmlFor="admissionFee"
                  >
                    Admission Fee ($)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      id="admissionFee"
                      name="admissionFee"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={editForm.admissionFee}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Floating refresh button for mobile */}
      <button 
        onClick={handleRefresh}
        className="md:hidden fixed right-4 bottom-40 bg-white text-indigo-600 h-12 w-12 rounded-full border border-indigo-200 shadow-md flex items-center justify-center active:bg-indigo-50"
        aria-label="Refresh centers"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}