import React from 'react';

interface StatusMessagesProps {
  successMessage: string | null;
  errorMessage: string | null;
  onClearSuccess: () => void;
  onClearError: () => void;
}

const StatusMessages: React.FC<StatusMessagesProps> = ({
  successMessage,
  errorMessage,
  onClearSuccess,
  onClearError
}) => {
  return (
    <>
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 relative flex items-center">
          <span className="flex-grow pr-8">{successMessage}</span>
          <button
            className="absolute top-3 right-3 text-green-700"
            onClick={onClearSuccess}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 relative flex items-center">
          <span className="flex-grow pr-8">{errorMessage}</span>
          <button
            className="absolute top-3 right-3 text-red-700"
            onClick={onClearError}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
};

export default StatusMessages;
