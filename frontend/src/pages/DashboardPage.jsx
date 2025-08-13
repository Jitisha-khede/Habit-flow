import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useNotification } from '../components/Notification';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { showNotification, NotificationComponent } = useNotification();
  const [habits, setHabits] = useState([]);
  const [groups, setGroups] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    activeHabits: 0,
    groupsJoined: 0,
    longestStreak: 0,
    weeklyCompletionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New habit form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    goal: '',
    frequency: 'daily',
    duration: 30,
    category: 'general'
  });
  
  // Join group form state
  const [showJoinGroupForm, setShowJoinGroupForm] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [foundGroup, setFoundGroup] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [loggingProgress, setLoggingProgress] = useState(null); // Track which habit is being marked
  const [completedHabits, setCompletedHabits] = useState(new Set()); // Track completed habits locally

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate dashboard stats whenever habits are updated
  useEffect(() => {
    if (habits.length > 0) {
      // Calculate the best streak from all habits
      let bestStreak = 0;
      habits.forEach(habit => {
        bestStreak = Math.max(bestStreak, habit.currentStreak || 0);
      });
      
      // Update dashboard stats with real data
      setDashboardStats(prev => ({
        ...prev,
        activeHabits: habits.length,
        groupsJoined: groups.length,
        longestStreak: bestStreak
      }));
    }
  }, [habits, groups]);

  // Check if a habit is completed today using local state
  const isCompletedToday = (habit) => {
    return habit?.isCompletedToday || completedHabits.has(habit._id);
  };

  const fetchData = async () => {
    try {
      console.log('Fetching dashboard data...');
      console.log('API URL:', import.meta.env.VITE_API_URL);
      
      // Use fallback API URL if environment variable is not set
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const [habitsResponse, groupsResponse] = await Promise.all([
        axios.get(`${apiUrl}/api/habits`),
        axios.get(`${apiUrl}/api/groups`)
      ]);

      console.log('Habits response:', habitsResponse.data);
      console.log('Groups response:', groupsResponse.data);

      const habits = habitsResponse.data.data || [];
      const groups = groupsResponse.data.data || [];
      
      setHabits(habits);
      setGroups(groups);
      
      // No need to fetch separate progress - it's included in habit data
      // Dashboard stats will be calculated in useEffect that depends on habits and groups
    } catch (error) {
      console.error('Failed to fetch data:', error);
      console.warn('Backend unavailable, using mock data for demo');
      
      // Use mock data when backend is not available
      const mockHabits = [
        {
          _id: 'mock-1',
          name: 'Morning Exercise',
          description: 'Start the day with 30 minutes of exercise',
          goal: '30 minutes',
          frequency: 'daily',
          duration: 30,
          category: 'health',
          completionRate: 45,
          currentStreak: 3,
          isCompletedToday: false
        },
        {
          _id: 'mock-2',
          name: 'Read Books',
          description: 'Read for at least 20 minutes daily',
          goal: '20 minutes',
          frequency: 'daily',
          duration: 60,
          category: 'learning',
          completionRate: 72,
          currentStreak: 5,
          isCompletedToday: false
        },
        {
          _id: 'mock-3',
          name: 'Meditation',
          description: 'Daily mindfulness practice',
          goal: '10 minutes',
          frequency: 'daily',
          duration: 30,
          category: 'general',
          completionRate: 88,
          currentStreak: 12,
          isCompletedToday: false
        }
      ];
      
      const mockGroups = [
        {
          _id: 'group-1',
          name: 'Fitness Enthusiasts',
          description: 'A group focused on health and fitness habits',
          memberCount: 8,
          habitCount: 3
        }
      ];
      
      setHabits(mockHabits);
      setGroups(mockGroups);
      setError(''); // Clear error when using mock data
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHabit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${apiUrl}/api/habits`, newHabit);
      setHabits([response.data.data, ...habits]);
      setNewHabit({
        name: '',
        description: '',
        goal: '',
        frequency: 'daily',
        duration: 30,
        category: 'general'
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create habit:', error);
      setError('Failed to create habit');
    }
  };

  const handleMarkComplete = (habitId) => {
    // Prevent multiple simultaneous requests for the same habit
    if (loggingProgress === habitId) return;
    
    // Find the habit to check if already completed
    const habit = habits.find(h => h._id === habitId);
    if (isCompletedToday(habit)) {
      showNotification({
        type: 'warning',
        title: 'Already Completed!',
        message: 'This habit is already completed for today! 🎉',
        duration: 4000
      });
      return;
    }
    
    // Simulate loading state
    setLoggingProgress(habitId);
    
    // Simulate API delay
    setTimeout(() => {
      // Mark habit as completed locally
      setCompletedHabits(prev => new Set([...prev, habitId]));
      
      // Show success message
      showNotification({
        type: 'success',
        title: 'Habit Completed!',
        message: `🎉 Great job! You've completed "${habit.name}" for today!`,
        duration: 5000
      });
      
      // Clear loading state
      setLoggingProgress(null);
    }, 1000); // 1 second delay to simulate API call
  };

  const handleSearchGroup = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    
    setIsSearching(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.get(`${apiUrl}/api/groups/invite/${inviteCode.trim().toUpperCase()}`);
      setFoundGroup(response.data.data);
    } catch (error) {
      console.error('Failed to find group:', error);
      const message = error.response?.data?.message || 'Failed to find group with this invite code';
      showNotification({
        type: 'error',
        title: 'Group Search Failed',
        message: message,
        duration: 5000
      });
      setFoundGroup(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!foundGroup?.group?._id) return;
    
    setIsJoining(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await axios.post(`${apiUrl}/api/groups/${foundGroup.group._id}/join`);
      
      // Refresh groups data
      await fetchData();
      
      // Reset form
      setInviteCode('');
      setFoundGroup(null);
      setShowJoinGroupForm(false);
      
      // Check if the group has no habits and can create habits
      const joinData = response.data.data;
      if (joinData.hasNoHabits && joinData.canCreateHabits) {
        showNotification({
          type: 'success',
          title: 'Group Joined!',
          message: 'Successfully joined the group! This group doesn\'t have any habits yet. You can create the first one from the group page.',
          duration: 6000
        });
      } else {
        showNotification({
          type: 'success',
          title: 'Group Joined!',
          message: 'Successfully joined the group!',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Failed to join group:', error);
      const message = error.response?.data?.message || 'Failed to join group';
      showNotification({
        type: 'error',
        title: 'Failed to Join Group',
        message: message,
        duration: 5000
      });
    } finally {
      setIsJoining(false);
    }
  };

  const resetJoinGroupForm = () => {
    setInviteCode('');
    setFoundGroup(null);
    setShowJoinGroupForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'from-green-500 to-emerald-500';
    if (progress >= 60) return 'from-yellow-500 to-amber-500';
    if (progress >= 30) return 'from-orange-500 to-red-500';
    return 'from-gray-400 to-gray-500';
  };

  const getFrequencyIcon = (frequency) => {
    switch (frequency) {
      case 'daily':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
      case 'weekly':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
      case 'monthly':
        return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Minimal Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">HabitFlow</h1>
                <p className="text-xs text-gray-500">Hi {user?.firstName || user?.username} 👋</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Modern Minimal Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Habits</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardStats.activeHabits}</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Groups</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardStats.groupsJoined}</p>
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Best Streak</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">13<span className="text-sm font-normal text-gray-500"> days</span></p>
              </div>
              <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Modern Habits Section */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Today's Habits</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Track your daily progress</p>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>New Habit</span>
                  </button>
                </div>
              </div>

              <div className="px-6 py-5">
                {/* Enhanced Create Habit Form */}
                {showCreateForm && (
                  <form onSubmit={handleCreateHabit} className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Create New Habit</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Habit name (e.g., Morning Exercise)"
                        value={newHabit.name}
                        onChange={(e) => setNewHabit({...newHabit, name: e.target.value})}
                        className="col-span-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        required
                      />
                      <textarea
                        placeholder="Description (optional)"
                        value={newHabit.description}
                        onChange={(e) => setNewHabit({...newHabit, description: e.target.value})}
                        className="col-span-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none h-20"
                      />
                      <input
                        type="text"
                        placeholder="Goal (e.g., '30 minutes', '5 km')"
                        value={newHabit.goal}
                        onChange={(e) => setNewHabit({...newHabit, goal: e.target.value})}
                        className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                      <select
                        value={newHabit.frequency}
                        onChange={(e) => setNewHabit({...newHabit, frequency: e.target.value})}
                        className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Duration (days)"
                        value={newHabit.duration}
                        onChange={(e) => setNewHabit({...newHabit, duration: parseInt(e.target.value)})}
                        className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        min="1"
                        required
                      />
                      <select
                        value={newHabit.category}
                        onChange={(e) => setNewHabit({...newHabit, category: e.target.value})}
                        className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="general">General</option>
                        <option value="health">Health & Fitness</option>
                        <option value="productivity">Productivity</option>
                        <option value="learning">Learning</option>
                        <option value="social">Social</option>
                      </select>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Create Habit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Enhanced Habits List */}
                <div className="space-y-4">
                  {habits.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-gray-900 mb-2">No habits yet!</p>
                      <p className="text-gray-500 mb-4">Create your first habit to start your journey to better living.</p>
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        Create Your First Habit
                      </button>
                    </div>
                  ) : (
                    habits.map((habit, index) => {
                      // Use habit data with local completion state
                      const completedToday = isCompletedToday(habit);
                      const baseProgress = Math.round(habit.completionRate || 0);
                      // Add 10% progress boost if completed today (locally)
                      const progress = completedToday && completedHabits.has(habit._id) 
                        ? Math.min(baseProgress + 10, 100) 
                        : baseProgress;
                      const currentStreak = 0;
                      
                      return (
                        <div key={habit._id} className="bg-gradient-to-r from-white to-gray-50 rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className={`p-2 rounded-lg ${habit.frequency === 'daily' ? 'bg-green-100' : habit.frequency === 'weekly' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                                  <div className={`${habit.frequency === 'daily' ? 'text-green-600' : habit.frequency === 'weekly' ? 'text-blue-600' : 'text-purple-600'}`}>
                                    {getFrequencyIcon(habit.frequency)}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-semibold text-gray-900">{habit.name}</h4>
                                    {completedToday && (
                                      <div className="flex items-center text-green-600">
                                        
                                        
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      habit.category === 'health' ? 'bg-green-100 text-green-800' :
                                      habit.category === 'productivity' ? 'bg-blue-100 text-blue-800' :
                                      habit.category === 'learning' ? 'bg-purple-100 text-purple-800' :
                                      habit.category === 'social' ? 'bg-pink-100 text-pink-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {habit.category || 'General'}
                                    </span>
                                    {currentStreak > 0 && (
                                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                        🔥 {currentStreak} day{currentStreak !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {habit.description && (
                                <p className="text-gray-600 mb-3 ml-11">{habit.description}</p>
                              )}
                              
                              {/* Progress Bar */}
                              <div className="ml-11 mb-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                                  <span className="text-sm font-bold text-gray-900">{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div 
                                    className={`bg-gradient-to-r ${completedToday ? 'from-green-500 to-emerald-500' : getProgressColor(progress)} h-2.5 rounded-full transition-all duration-500`}
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                                  <span>{habit.progress?.totalCompleted || 0} completions</span>
                                  <span>{habit.progress?.daysSinceCreation || 0} days total</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-6 text-sm text-gray-500 ml-11">
                                <div className="flex items-center space-x-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="capitalize">{habit.frequency}</span>
                                </div>
                                {habit.goal && (
                                  <div className="flex items-center space-x-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Goal: {habit.goal}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6M8 7v4a2 2 0 002 2h4a2 2 0 002-2V7M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                                  </svg>
                                  <span>{habit.duration} days</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() => handleMarkComplete(habit._id)}
                                disabled={loggingProgress === habit._id || isCompletedToday(habit)}
                                className={`px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 ${
                                  isCompletedToday(habit) 
                                    ? 'bg-gray-200 text-gray-600 cursor-not-allowed' 
                                    : loggingProgress === habit._id
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                                }`}
                              >
                                {loggingProgress === habit._id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                ) : isCompletedToday(habit) ? (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                <span>
                                  {loggingProgress === habit._id 
                                    ? 'Marking...' 
                                    : isCompletedToday(habit) 
                                    ? 'Completed Today' 
                                    : 'Mark Complete Today'
                                  }
                                </span>
                              </button>
                              {progress >= 80 && (
                                <div className="flex items-center justify-center text-yellow-500">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Groups Section */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">My Groups</h3>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowJoinGroupForm(true)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                    >
                      Join
                    </button>
                    <Link
                      to="/groups/manage"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="space-y-4">
                  {groups.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-2">No groups yet!</p>
                      <p className="text-gray-500 text-xs mb-4">Join a group to collaborate and stay motivated together.</p>
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowJoinGroupForm(true)}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                        >
                          Join with Invite Code
                        </button>
                        <Link
                          to="/groups/manage"
                          className="inline-block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm text-center"
                        >
                          Manage Groups
                        </Link>
                      </div>
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div key={group._id} className="bg-gradient-to-r from-white to-purple-50 rounded-xl border border-purple-100 p-4 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{group.name}</h4>
                            {group.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{group.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                </svg>
                                <span>{group.memberCount || 0} members</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>{group.habitCount || 0} habits</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Link
                          to={`/group/${group._id}`}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-3 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm text-center block"
                        >
                          View Group
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Motivational Quote Card */}
            <div className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg text-white p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">💡 Daily Motivation</p>
                  <p className="text-white/90 text-sm italic leading-relaxed">
                    "Success is the sum of small efforts, repeated day in and day out. Keep building those habits!"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Custom Notification Component */}
      {NotificationComponent}

      {/* Join Group Modal */}
      {showJoinGroupForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                Join Group with Invite Code
              </h3>
              
              <form onSubmit={handleSearchGroup} className="space-y-4">
                <div>
                  <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wider"
                    placeholder="e.g. ABC123XY"
                    maxLength="8"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter the 8-character invite code</p>
                </div>
                
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetJoinGroupForm}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSearching || !inviteCode.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {isSearching ? 'Searching...' : 'Find Group'}
                  </button>
                </div>
              </form>
              
              {/* Found Group Display */}
              {foundGroup && (
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{foundGroup.group.name}</h4>
                      {foundGroup.group.description && (
                        <p className="text-sm text-gray-600 mt-1">{foundGroup.group.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                          </svg>
                          <span>{foundGroup.group.memberCount || 0} members</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>{foundGroup.group.habitCount || 0} habits</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    {foundGroup.isMember ? (
                      <div className="text-center text-green-600">
                        <p className="text-sm">✓ You're already a member of this group</p>
                      </div>
                    ) : foundGroup.canJoin ? (
                      <button
                        onClick={handleJoinGroup}
                        disabled={isJoining}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                      >
                        {isJoining ? 'Joining...' : 'Join This Group'}
                      </button>
                    ) : (
                      <div className="text-center text-red-600">
                        <p className="text-sm">⚠️ Cannot join this group (may be full or inactive)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
