import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setToken } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const userData = searchParams.get('user');
      const error = searchParams.get('error');

      if (error) {
        console.error('Google auth error:', error);
        navigate('/login?error=google_auth_failed');
        return;
      }

      if (token && userData) {
        try {
          const user = JSON.parse(decodeURIComponent(userData));
          
          // Store token and user data
          localStorage.setItem('token', token);
          setToken(token);
          setUser(user);
          
          // Set axios authorization header
          const axios = (await import('axios')).default;
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          console.log('Google auth successful, redirecting to dashboard');
          navigate('/dashboard');
        } catch (error) {
          console.error('Error processing Google auth callback:', error);
          navigate('/login?error=callback_failed');
        }
      } else {
        console.error('Missing token or user data in callback');
        navigate('/login?error=missing_data');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser, setToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Completing Google Sign-In...</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
