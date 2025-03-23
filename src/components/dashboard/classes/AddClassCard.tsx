import React from 'react';

interface AddClassCardProps {
  onClick: () => void;
}

const AddClassCard: React.FC<AddClassCardProps> = ({ onClick }) => {
  // Add touch ripple effect
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const elem = event.currentTarget;
    const rect = elem.getBoundingClientRect();
    const x = event.touches[0].clientX - rect.left;
    const y = event.touches[0].clientY - rect.top;
    
    // Create ripple effect
    const ripple = document.createElement('span');
    ripple.className = 'absolute rounded-full bg-blue-200 animate-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    elem.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  return (
    <div 
      className="border border-dashed border-gray-300 rounded-lg p-5 flex flex-col items-center justify-center h-64 sm:h-72 cursor-pointer hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] transition-all relative overflow-hidden"
      onClick={onClick}
      onTouchStart={handleTouchStart}
      role="button"
      aria-label="Add new class"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 transition-transform active:scale-95">
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <p className="text-lg font-medium text-blue-600">Add New Class</p>
      <p className="text-sm text-gray-500 text-center mt-2">
        Create a new class with schedule and details
      </p>
    </div>
  );
};

export default AddClassCard;
