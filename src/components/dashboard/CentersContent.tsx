import React, { useState, useEffect } from 'react';

interface Center {
  _id: string;
  cid: number;
  name: string;
  location: string;
  admissionFee: number;
}

export default function CentersContent() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [newCenter, setNewCenter] = useState({
    name: '',
    location: '',
    admissionFee: 0
  });

  // Define 5 colors for centers
  const centerColors = [
    'bg-indigo-200',
    'bg-emerald-200',
    'bg-amber-200',
    'bg-rose-200',
    'bg-violet-200'
  ];

  // Fetch centers on component mount
  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/center');
      const result = await response.json();
      
      if (result.success) {
        setCenters(result.data);
      } else {
        setError('Failed to load centers');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/center', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCenter),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Reset form and fetch updated centers
        setNewCenter({ name: '', location: '', admissionFee: 0 });
        setShowAddForm(false);
        fetchCenters();
      } else {
        setError(result.message || 'Failed to add center');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error(err);
    }
  };

  const handleDeleteCenter = async (cid: number) => {
    if (!confirm('Are you sure you want to delete this center?')) return;
    
    try {
      const response = await fetch(`/api/center?cid=${cid}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchCenters();
      } else {
        setError(result.message || 'Failed to delete center');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (editingCenter) {
      setEditingCenter({
        ...editingCenter,
        [name]: name === 'admissionFee' ? parseFloat(value) || 0 : value
      });
    } else {
      setNewCenter(prev => ({
        ...prev,
        [name]: name === 'admissionFee' ? parseFloat(value) || 0 : value
      }));
    }
  };
  
  const handleUpdateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCenter) return;
    
    try {
      const response = await fetch(`/api/center?cid=${editingCenter.cid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingCenter.name,
          location: editingCenter.location,
          admissionFee: editingCenter.admissionFee
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setEditingCenter(null);
        fetchCenters();
      } else {
        setError(result.message || 'Failed to update center');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error(err);
    }
  };

  return (
    <div className="bg-white shadow-md rounded p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Learning Centers</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition"
          disabled={editingCenter !== null}
        >
          {showAddForm ? 'Cancel' : 'Add Center'}
        </button>
      </div>
      
      <p className="text-gray-700 mb-4">
        Manage your educational centers and facility information.
      </p>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
          {error}
          <button className="ml-2 font-bold" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Add center form */}
      {showAddForm && !editingCenter && (
        <div className="border rounded-lg p-4 mb-6 bg-gray-50">
          <h3 className="font-medium text-lg mb-3">Add New Center</h3>
          <form onSubmit={handleAddCenter}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Center Name</label>
                <input
                  type="text"
                  name="name"
                  value={newCenter.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  name="location"
                  value={newCenter.location}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Admission Fee</label>
                <input
                  type="number"
                  name="admissionFee"
                  value={newCenter.admissionFee}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button 
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm"
              >
                Save Center
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading centers...</p>
        </div>
      )}

      {/* Centers grid */}
      {!loading && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {centers.length > 0 ? (
            centers.map(center => (
              <div key={center._id} className="border rounded-lg overflow-hidden">
                <div className={`h-40 ${centerColors[(center.cid - 1) % 5]} flex items-center justify-center`}>
                  <span className="text-2xl font-bold text-gray-700">{center.name.charAt(0)}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-lg">{center.name}</h3>
                  <p className="text-gray-600 mt-1">{center.location}</p>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    CID: {center.cid}
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Admission Fee: ${center.admissionFee}
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <button 
                      className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-100"
                      onClick={() => handleDeleteCenter(center.cid)}
                    >
                      Delete
                    </button>
                    <button 
                      className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-sm"
                      onClick={() => setEditingCenter(center)}
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-10 border rounded-lg">
              <p className="text-gray-500">No centers found. Add a center to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit center form */}
      {editingCenter && (
        <div className="border rounded-lg p-4 mb-6 bg-gray-50">
          <h3 className="font-medium text-lg mb-3">Edit Center</h3>
          <form onSubmit={handleUpdateCenter}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Center Name</label>
                <input
                  type="text"
                  name="name"
                  value={editingCenter.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  name="location"
                  value={editingCenter.location}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Admission Fee</label>
                <input
                  type="number"
                  name="admissionFee"
                  value={editingCenter.admissionFee}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button 
                type="button"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm"
                onClick={() => setEditingCenter(null)}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm"
              >
                Update Center
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}