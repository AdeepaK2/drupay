import React from 'react';
import { useSwipeable } from 'react-swipeable';

interface Schedule {
  _id: string;
  classId: string;
  date: string;
  month: number;
  year: number;
  dayOfWeek: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  notes?: string;
  attendance: {
    sid: string;
    present: boolean;
    notes?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface ScheduleItemProps {
  schedule: Schedule;
  onUpdateStatus: (id: string, status: 'scheduled' | 'completed' | 'cancelled') => void;
  onDeleteSchedule: (id: string) => void;
  onNavigateToAttendance: (schedule: Schedule) => void;
  formatScheduleDate: (dateString: string) => string;
  triggerVibration: () => void;
}

const ScheduleItem: React.FC<ScheduleItemProps> = ({
  schedule,
  onUpdateStatus,
  onDeleteSchedule,
  onNavigateToAttendance,
  formatScheduleDate,
  triggerVibration
}) => {
  // Now the hook is safely contained in its own component
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (schedule.status === 'scheduled') {
        triggerVibration();
        onUpdateStatus(schedule._id, 'cancelled');
      }
    },
    onSwipedRight: () => {
      if (schedule.status === 'scheduled') {
        triggerVibration();
        onUpdateStatus(schedule._id, 'completed');
      }
    },
    preventScrollOnSwipe: false,
    trackMouse: false,
    delta: 70
  });

  return (
    <div 
      {...swipeHandlers}
      className={`border rounded-lg p-3 relative ${
        schedule.status === 'cancelled' ? 'bg-gray-100 border-gray-200' : 
        schedule.status === 'completed' ? 'bg-green-50 border-green-200' : 
        'bg-white'
      } overflow-hidden touch-manipulation`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">
            {formatScheduleDate(schedule.date)}
            {schedule.status === 'cancelled' && (
              <span className="ml-2 text-xs bg-red-100 text-red-800 py-0.5 px-2 rounded">
                Cancelled
              </span>
            )}
            {schedule.status === 'completed' && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 py-0.5 px-2 rounded">
                Completed
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {schedule.startTime} - {schedule.endTime}
          </div>
        </div>
        
        {/* Mobile-friendly action buttons with better touch targets */}
        <div className="flex space-x-1">
          <button
            onClick={() => {
              triggerVibration();
              onNavigateToAttendance(schedule);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded active:bg-blue-100 active:scale-95 transition-transform"
            title="Take Attendance"
            style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          
          {schedule.status === 'scheduled' && (
            <>
              <button
                onClick={() => {
                  triggerVibration();
                  onUpdateStatus(schedule._id, 'completed');
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded active:bg-green-100 active:scale-95 transition-transform"
                title="Mark as Completed"
                style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              
              <button
                onClick={() => {
                  triggerVibration();
                  onUpdateStatus(schedule._id, 'cancelled');
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded active:bg-red-100 active:scale-95 transition-transform"
                title="Cancel Class"
                style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
          
          <button
            onClick={() => {
              triggerVibration();
              onDeleteSchedule(schedule._id);
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded active:bg-red-100 active:scale-95 transition-transform"
            title="Delete"
            style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {schedule.notes && (
        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
          {schedule.notes}
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        {schedule.attendance.length} students | {schedule.attendance.filter((a) => a.present).length} present
      </div>
    </div>
  );
};

export default ScheduleItem;