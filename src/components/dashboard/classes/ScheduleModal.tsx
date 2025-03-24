import React from 'react';
import { format, isPast, isToday } from 'date-fns';
import { useSwipeable } from 'react-swipeable';
import ScheduleItem from './ScheduleItem';

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

interface ClassData {
  _id: string;
  classId: string;
  name: string;
  centerId: number;
  grade: number;
  subject: string;
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
  };
  monthlyFee: number;
}

interface ScheduleFormData {
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

interface ScheduleModalProps {
  isOpen: boolean;
  selectedClass: ClassData | null;
  schedules: Schedule[];
  suggestedDates: Date[];
  scheduleFormData: ScheduleFormData;
  selectedMonth: number;
  selectedYear: number;
  loading: boolean;
  loadingSchedules: boolean;
  onClose: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onScheduleFormChange: (updatedForm: ScheduleFormData) => void;
  onBulkSchedule: () => void;
  onAddSchedule: () => void;
  onUpdateStatus: (id: string, status: 'scheduled' | 'completed' | 'cancelled') => void;
  onDeleteSchedule: (id: string) => void;
  onNavigateToAttendance: (schedule: Schedule) => void;
  formatScheduleDate: (dateString: string) => string;
  triggerVibration: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  selectedClass,
  schedules,
  suggestedDates,
  scheduleFormData,
  selectedMonth,
  selectedYear,
  loading,
  loadingSchedules,
  onClose,
  onMonthChange,
  onYearChange,
  onScheduleFormChange,
  onBulkSchedule,
  onAddSchedule,
  onUpdateStatus,
  onDeleteSchedule,
  onNavigateToAttendance,
  formatScheduleDate,
  triggerVibration
}) => {
  if (!isOpen || !selectedClass) return null;
  
  // Implement month swipe navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      onMonthChange(12);
      onYearChange(selectedYear - 1);
    } else {
      onMonthChange(selectedMonth - 1);
    }
    triggerVibration();
  };
  
  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onMonthChange(1);
      onYearChange(selectedYear + 1);
    } else {
      onMonthChange(selectedMonth + 1);
    }
    triggerVibration();
  };
  
  // Set up month swipe handlers
  const calendarSwipeHandlers = useSwipeable({
    onSwipedLeft: handleNextMonth,
    onSwipedRight: handlePrevMonth,
    preventScrollOnSwipe: false,
    trackMouse: false,
    delta: 50
  });
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col animate-modal-appear">
        {/* Modal Header - Sticky top with shadow on scroll */}
        <div className="sticky top-0 bg-white px-4 sm:px-6 py-4 border-b flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-lg font-semibold truncate max-w-[70%]">
            {selectedClass.name}
          </h2>
          <button
            onClick={() => {
              triggerVibration();
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-transform"
            aria-label="Close"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Regular schedule info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-sm font-medium text-blue-800">Regular Schedule:</p>
            <p className="text-sm text-blue-700">
              {selectedClass?.schedule?.days.join(', ')} • {selectedClass?.schedule?.startTime} - {selectedClass?.schedule?.endTime}
            </p>
          </div>
          
          {/* Month/Year Navigation - Improved for touch with swipe support */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1">
              <button 
                onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-transform"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center space-x-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => onMonthChange(parseInt(e.target.value))}
                  className="border rounded-md py-2 px-3 text-base appearance-none bg-white pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ minWidth: '120px', minHeight: '44px', touchAction: 'manipulation' }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                
                <select
                  value={selectedYear}
                  onChange={(e) => onYearChange(parseInt(e.target.value))}
                  className="border rounded-md py-2 px-3 text-base appearance-none bg-white pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ minHeight: '44px', touchAction: 'manipulation' }}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 1 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <button 
                onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-transform"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <button
              onClick={() => {
                triggerVibration();
                onBulkSchedule();
              }}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium flex items-center disabled:opacity-50 active:scale-95 transition-transform"
              disabled={loading || suggestedDates.length === 0}
              style={{ minHeight: '44px', touchAction: 'manipulation' }}
            >
              <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Bulk Schedule {suggestedDates.length > 0 ? `(${suggestedDates.length})` : ''}
            </button>
          </div>
          
          {/* Calendar with swipe support */}
          <div 
            className="mb-6 border rounded-lg p-3 md:p-4 bg-white shadow-sm"
            {...calendarSwipeHandlers}
          >
            {/* Swipe indicator */}
            <div className="text-xs text-center text-gray-400 mb-2 md:hidden">
              Swipe to change month
            </div>
            
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Generate empty spaces for days before the first of the month */}
              {Array.from({ length: new Date(selectedYear, selectedMonth - 1, 1).getDay() }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square"></div>
              ))}
              
              {/* Generate all days of the month */}
              {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }).map((_, index) => {
                const day = index + 1;
                const date = new Date(selectedYear, selectedMonth - 1, day);
                
                // Check if this date is in suggested dates
                const isSuggested = suggestedDates.some(suggestedDate => 
                  format(suggestedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                );
                
                // Check if this date already has a scheduled class
                const isScheduled = schedules.some(schedule => 
                  format(new Date(schedule.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                );
                
                // Get the schedule object if this date is scheduled
                const scheduleForDate = schedules.find(schedule => 
                  format(new Date(schedule.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                );
                
                // Determine the appropriate styling based on date status
                let bgColor = '';
                let textColor = '';
                let borderStyle = 'border border-gray-200';
                
                if (isPast(date) && !isToday(date)) {
                  // Past dates
                  bgColor = 'bg-gray-100';
                  textColor = 'text-gray-500';
                } else if (isScheduled) {
                  // Scheduled dates
                  if (scheduleForDate?.status === 'completed') {
                    bgColor = 'bg-green-100';
                    textColor = 'text-green-800';
                    borderStyle = 'border border-green-300';
                  } else if (scheduleForDate?.status === 'cancelled') {
                    bgColor = 'bg-red-50';
                    textColor = 'text-red-800';
                    borderStyle = 'border border-red-200 line-through';
                  } else {
                    bgColor = 'bg-blue-100';
                    textColor = 'text-blue-800';
                    borderStyle = 'border border-blue-300';
                  }
                } else if (isSuggested) {
                  // Suggested dates (not yet scheduled)
                  bgColor = 'bg-blue-50';
                  textColor = 'text-blue-600';
                  borderStyle = 'border border-blue-200 border-dashed';
                } else if (isToday(date)) {
                  // Today
                  bgColor = 'bg-yellow-50';
                  textColor = 'text-yellow-800';
                  borderStyle = 'border border-yellow-300';
                }
                
                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => {
                      if (!isPast(date) || isToday(date)) {
                        triggerVibration();
                        // Format date to YYYY-MM-DD for input
                        const formattedDate = format(date, 'yyyy-MM-dd');
                        onScheduleFormChange({
                          ...scheduleFormData,
                          date: formattedDate
                        });
                      }
                    }}
                    disabled={isPast(date) && !isToday(date)}
                    className={`
                      aspect-square flex items-center justify-center text-sm rounded-md
                      ${bgColor} ${textColor} ${borderStyle}
                      ${!isPast(date) || isToday(date) ? 'hover:bg-opacity-80 active:scale-95 transition-transform' : 'cursor-not-allowed opacity-50'}
                      ${scheduleFormData.date === format(date, 'yyyy-MM-dd') ? 'ring-2 ring-blue-500' : ''}
                    `}
                    style={{ minHeight: '40px', touchAction: 'manipulation' }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-2 sm:gap-3 text-xs mt-4 justify-center">
              <div className="flex items-center">
                <div className="h-3 w-3 bg-blue-50 border border-dashed border-blue-200 rounded-sm mr-1"></div>
                <span>Suggested</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 bg-blue-100 border border-blue-300 rounded-sm mr-1"></div>
                <span>Scheduled</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 bg-green-100 border border-green-300 rounded-sm mr-1"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 bg-red-50 border border-red-200 rounded-sm mr-1"></div>
                <span>Cancelled</span>
              </div>
            </div>
          </div>
          
          {/* Create Schedule Form - Improved for Mobile */}
          <div className="mb-6 border rounded-lg p-4 bg-white shadow-sm">
            <h3 className="text-md font-semibold mb-3">
              {scheduleFormData.date ? 
                `Schedule for ${new Date(scheduleFormData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}` : 
                'Create New Class Day'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleFormData.date}
                  onChange={(e) => onScheduleFormChange({...scheduleFormData, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]} // Disable past dates
                  className="border rounded-lg w-full py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  style={{ minHeight: '48px', touchAction: 'manipulation' }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={scheduleFormData.startTime}
                    onChange={(e) => onScheduleFormChange({...scheduleFormData, startTime: e.target.value})}
                    className="border rounded-lg w-full py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    style={{ minHeight: '48px', touchAction: 'manipulation' }}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={scheduleFormData.endTime}
                    onChange={(e) => onScheduleFormChange({...scheduleFormData, endTime: e.target.value})}
                    className="border rounded-lg w-full py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    style={{ minHeight: '48px', touchAction: 'manipulation' }}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={scheduleFormData.notes}
                  onChange={(e) => onScheduleFormChange({...scheduleFormData, notes: e.target.value})}
                  className="border rounded-lg w-full py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special notes for this class day..."
                  style={{ minHeight: '48px', touchAction: 'manipulation' }}
                />
              </div>
            </div>
            
            <button
              onClick={() => {
                triggerVibration();
                onAddSchedule();
              }}
              className="w-full mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 text-base font-medium disabled:opacity-70 active:scale-95 transition-transform"
              disabled={loading || !scheduleFormData.date}
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Schedule...
                </div>
              ) : (
                'Create Class Day'
              )}
            </button>
          </div>
          
          {/* Scheduled Days List - Improved for mobile with swipe actions */}
          <div className="border rounded-lg p-4 bg-white shadow-sm mb-4">
            <h3 className="text-md font-semibold mb-3">Scheduled Days</h3>
            
            {loadingSchedules ? (
              <div className="flex justify-center items-center py-8">
                <div className="h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
            ) : schedules.length > 0 ? (
              <>
                <div className="text-xs text-center text-gray-400 mb-2 md:hidden">
                  Swipe right to mark complete, swipe left to cancel
                </div>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {/* Replace the inline schedule items with the ScheduleItem component */}
                  {schedules.map(schedule => (
                    <ScheduleItem
                      key={schedule._id}
                      schedule={schedule}
                      onUpdateStatus={onUpdateStatus}
                      onDeleteSchedule={onDeleteSchedule}
                      onNavigateToAttendance={onNavigateToAttendance}
                      formatScheduleDate={formatScheduleDate}
                      triggerVibration={triggerVibration}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No scheduled days found for this month.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
