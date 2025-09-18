import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import  Notification  from '../components/Notification';

const GroupViewPage = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState(null);
  const [groupHabits, setGroupHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [habitProgress, setHabitProgress] = useState({});
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [progressLoading, setProgressLoading] = useState({});
  
  // Notification state
  const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });
  
  // Create habit form state
  const [showCreateHabitForm, setShowCreateHabitForm] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    goal: '',
    frequency: 'daily',
    duration: 30,
    category: 'general'
  });
  const [isCreatingHabit, setIsCreatingHabit] = useState(false);

  // Notification functions
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 5000);
  };

  const hideNotification = () => {
    setNotification({ show: false, type: 'success', message: '' });
  };

  // Get API base URL with fallback
  const getApiUrl = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      const [groupResponse, habitsResponse] = await Promise.all([
        axios.get(`${getApiUrl()}/api/groups/${groupId}`),
        axios.get(`${getApiUrl()}/api/habits/group/${groupId}`)
      ]);

      setGroup(groupResponse.data.data);
      const habits = habitsResponse.data.data.habits || [];
      setGroupHabits(habits);
      
      // Fetch progress data for each habit
      if (habits.length > 0) {
        await fetchProgressData(habits, groupResponse.data.data.members);
      }
    } catch (error) {
      console.error('Failed to fetch group data:', error);
      if (error.response?.status === 403) {
        setError('You do not have permission to view this group');
      } else if (error.response?.status === 404) {
        setError('Group not found');
      } else {
        setError('Failed to load group data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    setIsJoining(true);
    try {
      const response = await axios.post(`${getApiUrl()}/api/groups/${groupId}/join`);
      
      // Refresh group data to update member status
      await fetchGroupData();
      
      // Check if the group has no habits and can create habits
      const joinData = response.data.data;
      if (joinData.hasNoHabits && joinData.canCreateHabits) {
        showNotification('success', 'Successfully joined the group! This group doesn\'t have any habits yet. Would you like to create the first one?');
        // Automatically show the create habit form
        setTimeout(() => {
          setShowCreateHabitForm(true);
        }, 500);
      } else {
        showNotification('success', 'Successfully joined the group!');
      }
    } catch (error) {
      console.error('Failed to join group:', error);
      const message = error.response?.data?.message || 'Failed to join group';
      showNotification('error', message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) {
      return;
    }

    try {
      await axios.post(`${getApiUrl()}/api/groups/${groupId}/leave`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to leave group:', error);
      const message = error.response?.data?.message || 'Failed to leave group';
      showNotification('error', message);
    }
  };

  const fetchProgressData = async (habits, members) => {
    try {
      const progressData = {};
      
      // Fetch progress for each habit
      for (const habit of habits) {
        const responses = await Promise.allSettled(
          members.map(member => 
            axios.get(`${getApiUrl()}/api/progress/habit/${habit._id}?startDate=${getDateDaysAgo(7)}&endDate=${new Date().toISOString().split('T')[0]}`)
              .catch(() => ({ data: { data: { progress: [] } } }))
          )
        );
        
        progressData[habit._id] = {
          memberProgress: responses.map((response, index) => ({
            member: members[index],
            progress: response.status === 'fulfilled' ? response.value.data.data.progress || [] : []
          }))
        };
      }
      
      setHabitProgress(progressData);
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    }
  };

  const getDateDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const hasCompletedToday = (habitId) => {
    const today = getTodayString();
    const userProgress = habitProgress[habitId]?.memberProgress?.find(
      mp => mp.member._id === user?.id
    );
    
    return userProgress?.progress?.some(
      p => p.formattedDate === today && p.completed
    ) || false;
  };

  const handleLogProgress = async (habitId) => {
    setProgressLoading(prev => ({ ...prev, [habitId]: true }));
    
    try {
      await axios.post(`${getApiUrl()}/api/progress/complete-today`, {
        habitId
      });
      
      // Refresh progress data
      if (group && groupHabits.length > 0) {
        await fetchProgressData(groupHabits, group.members);
      }
      
      showNotification('success', 'Progress logged successfully!');
    } catch (error) {
      console.error('Failed to log progress:', error);
      const message = error.response?.data?.message || 'Failed to mark habit as complete';
      showNotification('error', message);
    } finally {
      setProgressLoading(prev => ({ ...prev, [habitId]: false }));
    }
  };

  const handleCreateHabit = async (e) => {
    e.preventDefault();
    setIsCreatingHabit(true);
    
    try {
      // First create the habit
      const habitResponse = await axios.post(`${getApiUrl()}/api/habits`, newHabit);
      const createdHabit = habitResponse.data.data;
      
      // Then add it to the group
      await axios.post(`${getApiUrl()}/api/groups/${groupId}/habits`, {
        habitId: createdHabit._id
      });
      
      // Reset form and refresh data
      setNewHabit({
        name: '',
        description: '',
        goal: '',
        frequency: 'daily',
        duration: 30,
        category: 'general'
      });
      setShowCreateHabitForm(false);
      
      // Refresh group data
      await fetchGroupData();
      
      showNotification('success', 'Habit created and added to group successfully!');
    } catch (error) {
      console.error('Failed to create habit:', error);
      const message = error.response?.data?.message || 'Failed to create habit';
      showNotification('error', message);
    } finally {
      setIsCreatingHabit(false);
    }
  };

  const renderProgressGrid = (habitId) => {
    const progressData = habitProgress[habitId];
    if (!progressData) return null;

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    return (
      <div className="mt-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Member Progress (Last 7 Days)</h5>
        <div className="space-y-2">
          {progressData.memberProgress.map((memberProgress) => (
            <div key={memberProgress.member._id} className="flex items-center space-x-2">
              <div className="w-24 text-xs text-gray-600 truncate">
                {memberProgress.member.firstName} {memberProgress.member.lastName}
              </div>
              <div className="flex space-x-1">
                {last7Days.map((date) => {
                  const dayProgress = memberProgress.progress.find(
                    p => p.formattedDate === date
                  );
                  const isCompleted = dayProgress?.completed || false;
                  const isToday = date === getTodayString();
                  
                  return (
                    <div
                      key={date}
                      className={`w-4 h-4 rounded-sm border ${
                        isCompleted
                          ? 'bg-green-500 border-green-600'
                          : isToday
                          ? 'bg-yellow-200 border-yellow-400'
                          : 'bg-gray-200 border-gray-300'
                      }`}
                      title={`${date} - ${isCompleted ? 'Completed' : 'Not completed'}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-200 rounded-sm"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
            <span>Not completed</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <Link
            to="/dashboard"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 transform hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Group not found</p>
          <Link
            to="/dashboard"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 transform hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const isCreator = group.creator._id === user?.id;
  const isMember = group.members.some(member => member._id === user?.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      <Notification
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={hideNotification}
      />

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 transform hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Dashboard</span>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
                {group.description && (
                  <p className="text-gray-600">{group.description}</p>
                )}
              </div>
            </div>
            
            {/* Join/Leave Button */}
            {!isMember && (
              <button
                onClick={handleJoinGroup}
                disabled={isJoining}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {isJoining ? 'Joining...' : 'Join Group'}
              </button>
            )}
            
            {isMember && !isCreator && (
              <button
                onClick={handleLeaveGroup}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                Leave Group
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Group Info */}
          <div className="lg:col-span-1">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Group Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Creator</label>
                    <p className="text-sm text-gray-900">
                      {group.creator.firstName} {group.creator.lastName} (@{group.creator.username})
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Members</label>
                    <p className="text-sm text-gray-900">{group.memberCount} / {group.maxMembers}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Privacy</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      group.isPrivate 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {group.isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>
                  
                  {group.inviteCode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Invite Code</label>
                      <p className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                        {group.inviteCode}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="text-sm text-gray-900">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-white overflow-hidden shadow rounded-lg mt-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Members ({group.memberCount})
                </h3>
                
                <div className="space-y-2">
                  {group.members.map((member) => (
                    <div key={member._id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {member.firstName?.charAt(0) || member.username?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-gray-500">@{member.username}</p>
                        </div>
                      </div>
                      {member._id === group.creator._id && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Creator
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Group Habits */}
          <div className="lg:col-span-2">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Group Habits ({groupHabits.length})
                  </h3>
                  {isMember && groupHabits.length > 0 && (
                    <button
                      onClick={() => setShowCreateHabitForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium"
                    >
                      Add Habit
                    </button>
                  )}
                </div>
                
                {groupHabits.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      No habits in this group yet.
                    </p>
                    {isMember && (
                      <button
                        onClick={() => setShowCreateHabitForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                      >
                        Create First Habit
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupHabits.map((habit) => (
                      <div key={habit._id} className="border rounded-lg p-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{habit.name}</h4>
                              {habit.description && (
                                <p className="text-sm text-gray-600 mt-1">{habit.description}</p>
                              )}
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                                <span className="capitalize">{habit.frequency}</span>
                                {habit.goal && <span>Goal: {habit.goal}</span>}
                                <span>{habit.duration} days</span>
                                {habit.category && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {habit.category}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Created by {habit.creator.firstName} {habit.creator.lastName}
                              </div>
                            </div>
                            
                            {isMember && (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => handleLogProgress(habit._id)}
                                  disabled={progressLoading[habit._id] || hasCompletedToday(habit._id)}
                                  className={`px-3 py-1 rounded text-sm font-medium ${
                                    hasCompletedToday(habit._id)
                                      ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                      : progressLoading[habit._id]
                                      ? 'bg-gray-400 text-white cursor-not-allowed'
                                      : 'bg-green-600 hover:bg-green-700 text-white'
                                  }`}
                                >
                                  {progressLoading[habit._id]
                                    ? 'Logging...'
                                    : hasCompletedToday(habit._id)
                                    ? '✓ Completed Today'
                                    : 'Mark Complete Today'
                                  }
                                </button>
                                <button
                                  onClick={() => setSelectedHabit(selectedHabit === habit._id ? null : habit._id)}
                                  className="px-3 py-1 rounded text-xs bg-blue-100 text-blue-800 hover:bg-blue-200"
                                >
                                  {selectedHabit === habit._id ? 'Hide Progress' : 'Show Progress'}
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Progress Grid - Show when habit is selected */}
                          {selectedHabit === habit._id && renderProgressGrid(habit._id)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Habit Modal */}
      {showCreateHabitForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                Create New Habit
              </h3>
              
              <form onSubmit={handleCreateHabit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Habit Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newHabit.name}
                    onChange={(e) => setNewHabit({...newHabit, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Morning Exercise"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={newHabit.description}
                    onChange={(e) => setNewHabit({...newHabit, description: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Brief description of the habit"
                  />
                </div>
                
                <div>
                  <label htmlFor="goal" className="block text-sm font-medium text-gray-700">
                    Goal
                  </label>
                  <input
                    type="text"
                    id="goal"
                    value={newHabit.goal}
                    onChange={(e) => setNewHabit({...newHabit, goal: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 30 minutes daily"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
                      Frequency *
                    </label>
                    <select
                      id="frequency"
                      value={newHabit.frequency}
                      onChange={(e) => setNewHabit({...newHabit, frequency: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                      Duration (days) *
                    </label>
                    <input
                      type="number"
                      id="duration"
                      value={newHabit.duration}
                      onChange={(e) => setNewHabit({...newHabit, duration: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="365"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="category"
                    value={newHabit.category}
                    onChange={(e) => setNewHabit({...newHabit, category: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="health">Health & Fitness</option>
                    <option value="productivity">Productivity</option>
                    <option value="learning">Learning</option>
                    <option value="mindfulness">Mindfulness</option>
                    <option value="social">Social</option>
                    <option value="creative">Creative</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateHabitForm(false);
                      setNewHabit({
                        name: '',
                        description: '',
                        goal: '',
                        frequency: 'daily',
                        duration: 30,
                        category: 'general'
                      });
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingHabit}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {isCreatingHabit ? 'Creating...' : 'Create Habit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupViewPage;
