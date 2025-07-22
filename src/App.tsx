import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext'; 
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import AppContent from './components/AppContent';
import SubscriptionPage from './components/SubscriptionPage';
import InviteAccept from './components/InviteAccept';
import AccessManagement from './components/AccessManagement';
import LandingPage from './components/LandingPage';
import Success from './pages/Success';
import Cancel from './pages/Cancel';

function AuthenticatedApp() {
  return (
    <ProtectedRoute>
      <AppContent />
    </ProtectedRoute>
  );
}

function PublicApp() {
  return <LandingPage />;
}

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <PublicApp />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/success" element={<Success />} />
            <Route path="/cancel" element={<Cancel />} /> 
            <Route path="/invite/:token" element={<InviteAccept />} />
            <Route path="*" element={<AppRouter />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;