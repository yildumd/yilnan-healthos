import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Records } from './pages/Records';
import { Accounts } from './pages/Accounts';
import { Nursing } from './pages/Nursing';
import { Doctor } from './pages/Doctor';
import { Lab } from './pages/Lab';
import { Pharmacy } from './pages/Pharmacy';
import { Admin } from './pages/Admin';
import { PatientOnboarding } from './pages/PatientOnboarding';
import { PatientPortal } from './pages/PatientPortal';
import { PatientFilePage } from './pages/PatientFilePage';
import { UserRole } from './types';

interface ProtectedRouteProps {
  children: (role: UserRole) => React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { role, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authenticating session...</p>
        </div>
      </div>
    );
  }
  
  if (!role) return <Navigate to="/" replace />;
  
  return <>{children(role)}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/onboarding" element={<PatientOnboarding />} />
          <Route path="/portal" element={<PatientPortal />} />
          
          {/* Protected routes - role is passed to each page component */}
          <Route path="/records" element={<ProtectedRoute>{(role) => <Records userRole={role} />}</ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute>{(role) => <Accounts userRole={role} />}</ProtectedRoute>} />
          <Route path="/nursing" element={<ProtectedRoute>{(role) => <Nursing userRole={role} />}</ProtectedRoute>} />
          <Route path="/doctor" element={<ProtectedRoute>{(role) => <Doctor userRole={role} />}</ProtectedRoute>} />
          <Route path="/lab" element={<ProtectedRoute>{(role) => <Lab userRole={role} />}</ProtectedRoute>} />
          <Route path="/pharmacy" element={<ProtectedRoute>{(role) => <Pharmacy userRole={role} />}</ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute>{(role) => <Admin userRole={role} />}</ProtectedRoute>} />
          
          {/* Patient file view - accessible by any authenticated role */}
          <Route path="/patient/:patientId" element={<ProtectedRoute>{(role) => <PatientFilePage userRole={role} />}</ProtectedRoute>} />
          
          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}