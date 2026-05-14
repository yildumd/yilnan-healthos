import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  HeartPulse, 
  Stethoscope, 
  Beaker, 
  Pill, 
  Settings,
  Heart,
  LogIn,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types';

const roles: { id: UserRole; icon: any; label: string; desc: string; color: string }[] = [
  { id: 'Records', icon: Users, label: 'Records', desc: 'Patient registration & files', color: 'blue' },
  { id: 'Accounts', icon: CreditCard, label: 'Accounts', desc: 'Payments & wallet management', color: 'green' },
  { id: 'Nurse', icon: HeartPulse, label: 'Nurse', desc: 'Vitals & observations', color: 'indigo' },
  { id: 'Doctor', icon: Stethoscope, label: 'Doctor', desc: 'Consultation & prescriptions', color: 'purple' },
  { id: 'Lab Technician', icon: Beaker, label: 'Lab Tech', desc: 'Tests & investigations', color: 'cyan' },
  { id: 'Pharmacy', icon: Pill, label: 'Pharmacy', desc: 'Medication dispensing', color: 'emerald' },
  { id: 'Admin', icon: Settings, label: 'Admin', desc: 'System configuration', color: 'slate' },
];

export const Login: React.FC = () => {
  const { user, setRole, login, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = React.useState(false);

  const handleClinicalLogin = async () => {
    setSigningIn(true);
    try {
      await login();
      // If the above doesn't throw, we expect onAuthStateChanged or setUser to update UI
    } catch (error: any) {
      console.error("Login failed:", error);
      alert("Authentication error. Please ensure your network node connection is active.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setRole(role);
    const pathMap: Record<UserRole, string> = {
      'Records': '/records',
      'Accounts': '/accounts',
      'Nurse': '/nursing',
      'Doctor': '/doctor',
      'Lab Technician': '/lab',
      'Pharmacy': '/pharmacy',
      'Admin': '/admin',
    };
    navigate(pathMap[role]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 selection:bg-blue-100">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        <div className="flex flex-col items-center mb-16 text-center">
          <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center mb-8 shadow-2xl shadow-slate-950/20">
            <Heart className="text-blue-400 w-7 h-7 fill-current" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-3">Yilnan <span className="text-blue-600">HealthOS</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Institutional Node Interface</p>
          <div className="w-8 h-1 bg-slate-200 rounded-full mt-4"></div>
        </div>

        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-12 rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/50 text-center max-w-md mx-auto"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-blue-100">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-4 tracking-tight">Security Gateway</h2>
              <p className="text-slate-500 text-sm font-medium mb-12">Authorized clinical personnel must authenticate via institutional identity provider to access the network nodes.</p>
              
              <button 
                onClick={handleClinicalLogin}
                disabled={signingIn}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {signingIn ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}
                {signingIn ? "Securing Session..." : "Enter Clinical Portal"}
              </button>
              
              <p className="mt-8 text-[9px] font-black text-slate-300 uppercase tracking-widest">End-to-End Encrypted Node Access</p>
            </motion.div>
          ) : (
            <motion.div 
              key="roles"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    {user.photoURL ? (
                      <img src={user.photoURL} className="w-10 h-10 rounded-full border border-slate-200 shadow-sm" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                        <Users size={16} />
                      </div>
                    )}
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authenticated as</p>
                       <p className="text-sm font-black text-slate-900">{user.displayName || 'Authorized Provider'}</p>
                    </div>
                 </div>
                 <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    Session Active
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role, index) => (
                  <motion.button
                    key={role.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleRoleSelect(role.id)}
                    className="bg-white p-8 rounded-xl border border-slate-200 text-left hover:border-slate-900 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden"
                  >
                    <div className="relative z-10">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mb-6 group-hover:bg-slate-900 group-hover:text-blue-400 group-hover:border-slate-900 transition-all duration-300">
                        <role.icon size={20} />
                      </div>
                      <h3 className="font-black text-slate-900 mb-1.5 uppercase tracking-widest text-[10px]">{role.label}</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{role.desc}</p>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-16 h-16 text-slate-50/50 group-hover:text-blue-50/50 transition-colors">
                       <role.icon size={64} strokeWidth={1} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 p-8 bg-blue-600 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-blue-200 overflow-hidden relative group">
           <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100 mb-2">Patient Access Point</p>
              <h2 className="text-2xl font-black tracking-tight mb-2">Public Health Entry</h2>
              <p className="text-blue-100 text-xs font-medium max-w-md">Self-register for clinical services or access your digital patient wallet for payments and history.</p>
           </div>
           <div className="flex gap-4 relative z-10">
              <button 
                onClick={() => navigate('/onboarding')}
                className="px-6 py-3 bg-white text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-lg"
              >
                Create Profile
              </button>
              <button 
                onClick={() => navigate('/portal')}
                className="px-6 py-3 bg-blue-700 text-white border border-blue-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-colors"
              >
                Access Wallet
              </button>
           </div>
           <HeartPulse className="absolute -bottom-8 -right-8 w-48 h-48 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" strokeWidth={1} />
        </div>

        <div className="mt-20 border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">v2.4.0 Stable</span>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Network Synchronized</span>
            </div>
          </div>
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">© 2026 Yilnan Infrastructure Group</p>
        </div>
      </motion.div>
    </div>
  );
};
