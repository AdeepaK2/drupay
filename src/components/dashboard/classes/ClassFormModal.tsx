import React from 'react';

interface ClassSchedule {
  days: string[];
  startTime: string;
  endTime: string;
}

interface ClassFormData {
  name: string;
  centerId: number;
  grade: number;
  subject: string;
  schedule: ClassSchedule;
  monthlyFee: number;
  classId?: string;
}

interface ClassFormModalProps {
  isOpen: boolean;
  isEditMode: boolean;
  formData: ClassFormData;
  loading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleDaysChange: (day: string) => void;
  triggerVibration: () => void;
}

const ClassFormModal: React.FC<ClassFormModalProps> = ({
  isOpen,
  isEditMode,
  formData,
  loading,
  onClose,
  onSubmit,
  handleFormChange,
  handleDaysChange,
  triggerVibration
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div 
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-modal-appear"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center z-10">
          <h2 className="text-lg font-semibold">
            {isEditMode ? "Edit Class" : "Add New Class"}
          </h2>
          <button
            onClick={() => {
              triggerVibration();
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-transform"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Class Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              className="border rounded-lg w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              required
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Grade Level
              </label>
              <input
                type="number"
                inputMode="numeric"
                name="grade"
                value={formData.grade}
                onChange={handleFormChange}
                className="border rounded-lg w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                min="1"
                max="12"
                required
                style={{ minHeight: '48px', touchAction: 'manipulation' }}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Center ID
              </label>
              <input
                type="number"
                inputMode="numeric"
                name="centerId"
                value={formData.centerId}
                onChange={handleFormChange}
                className="border rounded-lg w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                min="1"
                required
                style={{ minHeight: '48px', touchAction: 'manipulation' }}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleFormChange}
              className="border rounded-lg w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              required
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Monthly Fee ($)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                inputMode="decimal"
                name="monthlyFee"
                value={formData.monthlyFee}
                onChange={handleFormChange}
                className="border rounded-lg w-full pl-10 pr-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                min="0"
                step="0.01"
                required
                style={{ minHeight: '48px', touchAction: 'manipulation' }}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Schedule Days
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <div 
                  key={day} 
                  onClick={() => {
                    triggerVibration();
                    handleDaysChange(day);
                  }}
                  className={`
                    border rounded-lg p-3 text-center text-sm cursor-pointer transition-all
                    ${formData.schedule.days.includes(day) ? 
                      'bg-blue-100 border-blue-300 text-blue-700 shadow-inner' : 
                      'border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                    }
                    active:scale-95
                  `}
                  style={{ minHeight: '44px', touchAction: 'manipulation' }}
                >
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Start Time
              </label>
              <input
                type="time"
                name="schedule.startTime"
                value={formData.schedule.startTime}
                onChange={handleFormChange}
                className="border rounded-lg w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
                name="schedule.endTime"
                value={formData.schedule.endTime}
                onChange={handleFormChange}
                className="border rounded-lg w-full py-3 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                required
                style={{ minHeight: '48px', touchAction: 'manipulation' }}
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                triggerVibration();
                onClose();
              }}
              className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 active:bg-gray-400 text-sm font-medium active:scale-95 transition-transform"
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 text-sm font-medium disabled:opacity-70 active:scale-95 transition-transform"
              disabled={loading}
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isEditMode ? 'Updating...' : 'Adding...'}
                </div>
              ) : (
                isEditMode ? 'Update Class' : 'Add Class'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassFormModal;
