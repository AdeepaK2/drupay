import React from 'react';

interface ClassCardProps {
  cls: {
    classId: string;
    name: string;
    centerId: number;
    grade: number;
    subject: string;
    schedule?: {
      days: string[];
      startTime: string;
      endTime: string;
    };
    monthlyFee: number;
  };
  studentCount: number | string;
  loadingCount: boolean;
  onEdit: (cls: ClassCardProps['cls']) => void;
  onSchedule: (cls: ClassCardProps['cls']) => void;
  onDelete: (cls: ClassCardProps['cls']) => void;
  formatSchedule: (schedule?: { days: string[]; startTime: string; endTime: string }) => string;
  triggerVibration: () => void;
}

const ClassCard: React.FC<ClassCardProps> = ({
  cls,
  studentCount,
  loadingCount,
  onEdit,
  onSchedule,
  onDelete,
  formatSchedule,
  triggerVibration,
}) => {
  return (
    <div
      className="bg-white border rounded-lg shadow-sm overflow-hidden flex flex-col transition-all relative active:scale-[0.98] active:shadow-inner"
      style={{ minHeight: '250px' }} // Increased minimum height
    >
      {/* Class Header */}
      <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-lg truncate pr-2" title={cls.name}>
            {cls.name}
          </h3>
          <span className="text-xs bg-white bg-opacity-30 px-2 py-1 rounded">
            {cls.classId}
          </span>
        </div>
        <p className="text-sm text-blue-100 mt-1">
          Grade {cls.grade} • {cls.subject}
        </p>
      </div>

      {/* Class Details */}
      <div className="p-4 flex-grow overflow-y-auto" style={{ minHeight: '100px', maxHeight: '150px' }}>
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <p className="text-gray-500">Monthly Fee</p>
            <p className="font-semibold">${cls.monthlyFee.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500">Students</p>
            <div className="flex items-center">
              <p className="font-semibold">{studentCount}</p>
              {loadingCount && studentCount === '-' && (
                <div className="ml-2 w-3 h-3 border-t-2 border-blue-500 rounded-full animate-spin"></div>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-gray-500 text-sm">Schedule</p>
          <p className="font-medium text-sm">
            {cls && cls.schedule !== undefined ? formatSchedule(cls.schedule) : 'No schedule'}
          </p>
        </div>
      </div>

      {/* Actions - Fixed for Mobile */}
      <div className="border-t bg-gray-50 w-full">
        {/* Text-only button layout */}
        <div className="flex justify-between p-1" style={{ minHeight: '44px' }}>
          <button
            onClick={() => {
              triggerVibration();
              onEdit(cls);
            }}
            className="font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-all rounded-md px-1 py-2 flex-[0.8] text-xs sm:text-sm mx-0.5"
          >
            Edit
          </button>
          <button
            onClick={() => {
              triggerVibration();
              onSchedule(cls);
            }}
            className="font-medium text-green-600 hover:bg-green-50 active:bg-green-100 transition-all rounded-md px-1 py-2 flex-[1.2] text-xs sm:text-sm mx-0.5"
          >
            Schedule
          </button>
          <button
            onClick={() => {
              triggerVibration();
              onDelete(cls);
            }}
            className="font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-all rounded-md px-1 py-2 flex-[0.8] text-xs sm:text-sm mx-0.5"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassCard;
