"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Center {
  cid: number;
  name: string;
  location: string;
  admissionFee: number;
}

interface Class {
  classId: string;
  name: string;
  grade: number;
  subject: string;
  schedule: string | { days: string[]; startTime: string; endTime: string };
  monthlyFee: number;
}

export default function CenterPage({ params }: { params: Promise<{ cid: string }> }) {
  const router = useRouter();

  // Unwrap the params object
  const [cid, setCid] = useState<string | null>(null);

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setCid(resolvedParams.cid);
    };

    unwrapParams();
  }, [params]);

  const [center, setCenter] = useState<Center | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cid) return;

    const fetchCenterAndClasses = async () => {
      try {
        setLoading(true);

        // Fetch center details
        const centerResponse = await fetch(`/api/center?cid=${cid}`);
        if (!centerResponse.ok) {
          throw new Error("Failed to fetch center details");
        }
        const centerData = await centerResponse.json();
        if (!centerData.success) {
          throw new Error(centerData.message || "Center not found");
        }
        setCenter(centerData.data);

        // Fetch classes for the center
        const classesResponse = await fetch(`/api/class?centerId=${cid}`);
        if (!classesResponse.ok) {
          throw new Error("Failed to fetch classes");
        }
        const classesData = await classesResponse.json();
        setClasses(classesData);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchCenterAndClasses();
  }, [cid]);

  if (!cid) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-lg font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-lg font-semibold text-gray-600">Loading Center Data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 text-xl font-bold mb-4">Error</div>
        <div className="text-red-400">{error}</div>
        <button
          onClick={() => router.back()}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return to Centers
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with navigation */}
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Centers
        </button>
      </div>

      {/* Center Details Card */}
      {center && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8 border border-gray-100">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
            <h1 className="text-2xl font-bold text-blue-800">{center.name}</h1>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-blue-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-gray-700">{center.location}</span>
              </div>
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-blue-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="font-semibold text-blue-800">${center.admissionFee} <span className="text-gray-500 font-normal">admission fee</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Classes Section */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Classes</h2>
          <div className="ml-3 bg-blue-100 text-blue-800 text-sm font-semibold py-1 px-3 rounded-full">
            {classes.length} total
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  No classes available for this center yet. Classes can be added from the class management section.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classObj) => (
              <div
                key={classObj.classId}
                className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300"
              >
                <div className="bg-gradient-to-r from-blue-50 to-white px-4 py-3 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">{classObj.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Grade {classObj.grade}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-500 mb-1">Subject</div>
                    <div className="text-gray-700">{classObj.subject}</div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-500 mb-1">Schedule</div>
                    <div className="text-gray-700">
                      {typeof classObj.schedule === "object" ? (
                        <span>
                          {classObj.schedule.days.join(", ")} <br />
                          <span className="text-sm text-gray-600">
                            {classObj.schedule.startTime} to {classObj.schedule.endTime}
                          </span>
                        </span>
                      ) : (
                        classObj.schedule
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium text-gray-500">Monthly Fee</div>
                      <div className="text-lg font-bold text-blue-600">${classObj.monthlyFee}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}