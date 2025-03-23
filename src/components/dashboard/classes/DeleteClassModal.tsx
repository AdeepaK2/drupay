import React, { useState } from 'react';

interface DeleteClassModalProps {
  isOpen: boolean;
  className: string;
  loading: boolean;
  onCancel: () => void;
  onDelete: () => void;
  triggerVibration: () => void;
}

const DeleteClassModal: React.FC<DeleteClassModalProps> = ({
  isOpen,
  className,
  loading,
  onCancel,
  onDelete,
  triggerVibration
}) => {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  // Handle swipe to confirm deletion
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    // Only allow right swipe (positive diff)
    if (diff > 0) {
      // Calculate progress as percentage of total width
      const containerWidth = e.currentTarget.clientWidth;
      const progress = Math.min(100, (diff / (containerWidth * 0.7)) * 100);
      setSwipeProgress(progress);
    }
  };
  
  const handleTouchEnd = () => {
    setIsSwiping(false);
    // If swiped more than 70%, confirm delete
    if (swipeProgress > 70) {
      triggerVibration();
      onDelete();
    } else {
      // Reset progress
      setSwipeProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div 
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full animate-modal-appear"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-red-600">Delete Class</h2>
        <p className="mb-6 text-sm sm:text-base">
          Are you sure you want to delete the class "{className}"? This action cannot be undone.
        </p>
        
        {/* Swipe to confirm on mobile */}
        <div className="mb-5 relative h-12 rounded-lg bg-gray-100 overflow-hidden md:hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-red-500 h-full transition-all duration-75 ease-out"
            style={{ width: `${swipeProgress}%` }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-700"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {swipeProgress > 70 ? 'Release to delete' : 'Swipe right to delete'}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-end">
          <button
            onClick={() => {
              triggerVibration();
              onCancel();
            }}
            className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 active:bg-gray-400 text-sm font-medium active:scale-95 transition-transform"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              triggerVibration();
              onDelete();
            }}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 text-sm font-medium disabled:opacity-70 active:scale-95 transition-transform md:block hidden"
            disabled={loading}
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Deleting...
              </div>
            ) : (
              'Delete Class'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteClassModal;
