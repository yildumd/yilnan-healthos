import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HeartPulse, 
  Users, 
  CreditCard, 
  Stethoscope, 
  Beaker, 
  Pill, 
  Settings, 
  LogOut,
  Search,
  Bell
} from 'lucide-react';
import { motion } from 'motion/react';

const sidebarItems = [
  { role: 'Records', icon: Users, label: 'Records', path: '/records' },
  { role: 'Accounts', icon: CreditCard, label: 'Accounts', path: '/accounts' },
  { role: 'Nurse', icon: HeartPulse, label: 'Nursing', path: '/nursing' },
  { role: 'Doctor', icon: Stethoscope, label: 'Consultation', path: '/doctor' },
  { role: 'Lab Technician', icon: Beaker, label: 'Laboratory', path: '/lab' },
  { role: 'Pharmacy', icon: Pill, label: 'Pharmacy', path: '/pharmacy' },
  { role: 'Admin', icon: Settings, label: 'Administration', path: '/admin' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, setRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setRole(null);
    navigate('/');
  };

  const [search, setSearch] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", search);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-blue-100">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
             <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shadow-xl shadow-slate-200">
                <HeartPulse className="text-blue-400 w-5 h-5" />
             </div>
             <div className="flex flex-col">
                <h1 className="text-sm font-black tracking-tighter text-slate-900 leading-none">HealthOS</h1>
                <p className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1">Yilnan System</p>
             </div>
          </div>
          
          <div className="h-8 w-px bg-slate-100 mx-2"></div>
          
          <div className="flex items-center gap-2 text-[9px] bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 font-bold uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            Node: <span className="text-slate-900 tracking-normal ml-0.5">{role}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <form onSubmit={handleSearch} className="relative group hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search Integrated Patient Master File..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-96 h-10 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-inner"
            />
          </form>
          
          <div className="flex items-center gap-6 border-l border-slate-100 pl-8">
             <button className="text-slate-400 hover:text-blue-600 transition-colors relative">
               <Bell size={18} />
               <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
             </button>
             
             <div className="flex items-center gap-4 group cursor-pointer">
               <div className="text-right leading-none hidden xl:block">
                 <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Active Operator</p>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Operational</p>
               </div>
               <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-blue-400 text-xs shadow-lg transform group-hover:scale-105 transition-all">
                 {role?.[0]}
               </div>
             </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col px-4 py-8 shrink-0 overflow-y-auto">
          <div className="px-4 mb-10">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Cloud Infrastructure</p>
             <nav className="space-y-1.5">
               {sidebarItems.map((item) => {
                 const isActive = role === item.role;
                 return (
                   <button
                     key={item.role}
                     onClick={() => {
                       setRole(item.role as any);
                       navigate(item.path);
                     }}
                     className={`w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all group relative overflow-hidden ${
                       isActive 
                         ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                         : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                     }`}
                   >
                     <item.icon size={16} className={isActive ? 'text-blue-400' : 'text-slate-300 group-hover:text-slate-900'} />
                     {item.label}
                   </button>
                 );
               })}
             </nav>
          </div>

          <div className="mt-auto px-4 space-y-6">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Identity Matrix</p>
                <button 
                   onClick={handleLogout}
                   className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                >
                  <LogOut size={16} />
                  Terminate Session
                </button>
             </div>

             <div className="p-5 bg-slate-900 rounded-2xl relative overflow-hidden group shadow-xl">
                <div className="relative z-10">
                   <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Sync Status</p>
                   <div className="flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      Operational
                   </div>
                </div>
                <HeartPulse size={80} className="absolute -bottom-4 -right-4 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
             </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="flex-1 overflow-auto p-4 md:p-8 lg:p-12 scrollbar-hide">
            <div className="max-w-7xl mx-auto h-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
