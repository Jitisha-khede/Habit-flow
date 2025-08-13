import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Import pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import GroupViewPage from './pages/GroupViewPage'
import PublicGroupsPage from './pages/PublicGroupsPage';
import GroupManagementPage from './pages/GroupManagementPage';
import GoogleAuthCallback from './components/GoogleAuthCallback';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/groups/public"
              element={
                <ProtectedRoute>
                  <PublicGroupsPage />
                </ProtectedRoute>
             }
            />
            <Route
              path="/groups/manage"
              element={
                <ProtectedRoute>
                  <GroupManagementPage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/group/:groupId" 
              element={
                <ProtectedRoute>
                  <GroupViewPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

// export default function App() {
//   return (
//     <div className="bg-blue-500 text-white p-4">
//       Tailwind is working 🎉
//     </div>
//   );
// }
