import React from 'react';

interface ClassCardProps {
  cls: {
    _id: string;
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
  formatSchedule: (schedule?: { days: string[], startTime: string, endTime: string }) => string;
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
  triggerVibration
}) => {
  // Function to handle card press with ripple effect
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const elem = event.currentTarget;
    const rect = elem.getBoundingClientRect();
    const x = event.touches[0].clientX - rect.left;
    const y = event.touches[0].clientY - rect.top;
    
    // Create ripple effect
    const ripple = document.createElement('span');
    ripple.className = 'absolute rounded-full bg-black bg-opacity-10 animate-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    elem.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  return (
    <div 
      className="bg-white border rounded-lg shadow-sm overflow-hidden h-64 sm:h-72 flex flex-col transition-all relative active:scale-[0.98] active:shadow-inner"
      onTouchStart={handleTouchStart}
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
      <div className="p-4 flex-grow">
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
        
        <div className="mb-3">
          <p className="text-gray-500 text-sm">Schedule</p>
          <p className="font-medium text-sm">
            {cls && cls.schedule !== undefined ? formatSchedule(cls.schedule) : 'No schedule'}
          </p>
        </div>
      </div>
      
      {/* Actions - Improved touch targets */}
      <div className="border-t p-2 bg-gray-50 mt-auto flex">
        <button
          onClick={() => {
            triggerVibration();
            onEdit(cls);
          }}
          className="flex-1 py-3 flex items-center justify-center text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-md mr-1 transition-all touch-manipulation"
          style={{ minHeight: '44px' }}
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Edit
        </button>
        <button
          onClick={() => {
            triggerVibration();
            onSchedule(cls);
          }}
          className="flex-1 py-3 flex items-center justify-center text-green-600 hover:bg-green-50 active:bg-green-100 rounded-md mr-1 transition-all touch-manipulation"
          style={{ minHeight: '44px' }}
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Schedule
        </button>
        <button
          onClick={() => {
            triggerVibration();
            onDelete(cls);
          }}
          className="flex-1 py-3 flex items-center justify-center text-red-600 hover:bg-red-50 active:bg-red-100 rounded-md transition-all touch-manipulation"
          style={{ minHeight: '44px' }}
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
};

export default ClassCard;
