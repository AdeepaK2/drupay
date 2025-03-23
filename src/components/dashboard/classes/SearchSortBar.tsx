import React, { useState } from 'react';

interface SearchSortBarProps {
  searchTerm: string;
  sortOption: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onClearSearch: () => void;
}

const SearchSortBar: React.FC<SearchSortBarProps> = ({
  searchTerm,
  sortOption,
  onSearchChange,
  onSortChange,
  onClearSearch
}) => {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Handle filter button click with animation
  const toggleFilter = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  return (
    <div className="mb-6">
      {/* Search bar with clear button - optimized for touch */}
      <div className="relative w-full mb-3">
        <input
          type="text"
          placeholder="Search classes..."
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm"
          style={{ minHeight: '48px', touchAction: 'manipulation' }}
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className="absolute right-3 flex items-center h-full">
          {searchTerm && (
            <button
              className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={onClearSearch}
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <button
            className={`h-8 w-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors ${isFilterExpanded ? 'bg-blue-50 text-blue-500' : ''}`}
            onClick={toggleFilter}
            aria-label="Toggle filters"
            style={{ touchAction: 'manipulation' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Sort options - expand on filter button click */}
      <div 
        className={`bg-white rounded-lg border p-3 mb-2 transition-all duration-300 origin-top ${
          isFilterExpanded ? 'max-h-96 opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-0 hidden'
        }`}
      >
        <div className="flex items-center gap-3">
          <label htmlFor="sort" className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
          <div className="relative flex-grow">
            <select
              id="sort"
              value={sortOption}
              onChange={onSortChange}
              className="appearance-none w-full border rounded-md py-2 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              style={{ minHeight: '44px', touchAction: 'manipulation' }}
            >
              <option value="name">Name</option>
              <option value="grade">Grade</option>
              <option value="subject">Subject</option>
              <option value="fee">Fee</option>
              <option value="students">Students</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sort indicator when filter is collapsed */}
      {!isFilterExpanded && (
        <div className="flex items-center text-xs text-gray-500">
          <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Sorted by: {sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}
        </div>
      )}
    </div>
  );
};

export default SearchSortBar;
