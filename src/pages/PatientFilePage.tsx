import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PatientFile } from '../components/PatientFile';
import { ChevronLeft, Printer, Share2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface PatientFilePageProps {
  userRole?: UserRole;
}

export const PatientFilePage: React.FC<PatientFilePageProps> = ({ userRole }) => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { role: authRole, loading } = useAuth();

  // Use passed prop or fallback to auth context
  const effectiveRole = userRole || authRole;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!effectiveRole) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center p-20 text-center">
          <ShieldAlert size={48} className="text-red-400 mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Access Denied – No role assigned</p>
        </div>
      </Layout>
    );
  }

  if (!patientId) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center p-20 text-center">
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Invalid Patient Identity</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Electronic Health Record</h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Master Medical Archive • Confidential</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Only allow print/share for clinical staff (optional) */}
            {effectiveRole !== 'Patient' && (
              <>
                <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                  <Printer size={14} />
                  Print File
                </button>
                <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200/50">
                  <Share2 size={14} className="text-blue-400" />
                  Transfer Records
                </button>
              </>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <PatientFile patientId={patientId} userRole={effectiveRole} />
        </motion.div>
      </div>
    </Layout>
  );
};