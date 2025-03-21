import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
      const classResponse = await fetch("/api/class");

      // Check if response is ok
      if (!classResponse.ok) {
        throw new Error(
          `API error: ${classResponse.status} ${classResponse.statusText}`
        );
      }

      // Check content type
      const contentType = classResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format. Expected JSON.");
      }

      const allClasses = await classResponse.json();

      if (Array.isArray(allClasses)) {
        // Group classes by centerId
        const counts: { [key: number]: number } = {};

        allClasses.forEach((classObj) => {
          if (counts[classObj.centerId]) {
            counts[classObj.centerId]++;
          } else {
            counts[classObj.centerId] = 1;
          }
        });

        setClassCounts(counts);
      }
    } catch (err: any) {
      console.error("Error fetching class counts:", err);
      // Don't set error state here since we still want to show centers even if class counts fail
    }
  };

  const handleManageClick = (cid: number) => {
    router.push(`/${cid}`);
  };

  const handleEditClick = (center: Center) => {
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
      <div className="bg-white shadow-md rounded p-6">
        <h2 className="text-xl font-semibold mb-4">Learning Centers</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-md rounded p-6">
        <h2 className="text-xl font-semibold mb-4">Learning Centers</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="mb-2">Error: {error}</p>
          <div className="text-xs mb-2">
            If you're seeing a message about invalid JSON or DOCTYPE, your API
            server might not be running correctly.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded p-6">
      <h2 className="text-xl font-semibold mb-4">Learning Centers</h2>
      <p className="text-gray-700 mb-4">
        Manage your educational centers and facility information.
      </p>

      {centers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No centers found. Please add a center to get started.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {centers.map((center, index) => (
            <div
              key={center._id}
              className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
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
                    className="flex-1 py-2 px-4 rounded font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Manage
                  </button>

                  <button
                    onClick={() => handleEditClick(center)}
                    className="flex-1 py-2 px-4 rounded font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  Edit Center #{selectedCenter.cid}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
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

              {updateError && (
                <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                  {updateError}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
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
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
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
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label
                    className="block text-gray-700 text-sm font-bold mb-2"
                    htmlFor="admissionFee"
                  >
                    Admission Fee ($)
                  </label>
                  <input
                    id="admissionFee"
                    name="admissionFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.admissionFee}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
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
    </div>
  );
}
