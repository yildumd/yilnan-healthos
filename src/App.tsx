import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';

import { Records } from './pages/Records';
import { Accounts } from './pages/Accounts';
import { Nursing } from './pages/Nursing';
import { Doctor } from './pages/Doctor';
import { Lab } from './pages/Lab';
import { Pharmacy } from './pages/Pharmacy';
import { Admin } from './pages/Admin';
import { PatientOnboarding } from './pages/PatientOnboarding';
import { PatientPortal } from './pages/PatientPortal';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!role) return <Navigate to="/" />;
  
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
          <Route path="/nursing" element={<ProtectedRoute><Nursing /></ProtectedRoute>} />
          <Route path="/doctor" element={<ProtectedRoute><Doctor /></ProtectedRoute>} />
          <Route path="/lab" element={<ProtectedRoute><Lab /></ProtectedRoute>} />
          <Route path="/pharmacy" element={<ProtectedRoute><Pharmacy /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/onboarding" element={<PatientOnboarding />} />
          <Route path="/portal" element={<PatientPortal />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
