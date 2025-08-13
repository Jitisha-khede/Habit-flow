import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const PublicGroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPublicGroups();
  }, []);

  const fetchPublicGroups = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/groups/public`);
      setGroups(response.data.data);
      setError('');
    } catch (error) {
      console.error('Failed to fetch public groups:', error);
      setError('Failed to load public groups. Please try again.');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link
            to="/dashboard"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 mr-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent flex-1">
            🌐 Browse Public Groups
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">{error}</p>
                <button
                  onClick={fetchPublicGroups}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></span>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center text-gray-500">No public groups found.</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {groups.map(group => (
              <div
                key={group._id}
                className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between border border-gray-100 hover:shadow-2xl transition-shadow duration-200"
              >
                <div>
                  <h3 className="text-xl font-semibold text-blue-700 mb-2">{group.name}</h3>
                  <p className="text-gray-600 mb-4">{group.description || "No description."}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>Members: {group.members?.length ?? 0}</span>
                    {group.creator && (
                      <span>• Created by: {group.creator.name || "Unknown"}</span>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Link
                    to={`/group/${group._id}`}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg shadow hover:shadow-md transition-all duration-150 font-medium"
                  >
                    View Group
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicGroupsPage;