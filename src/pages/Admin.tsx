import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLog } from '../types';
import { 
  ShieldCheck, 
  History, 
  Terminal,
  Activity,
  Layers,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

export const Admin: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
    });
  }, []);

  return (
    <Layout>
      <div className="space-y-12 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Architecture</h1>
          <p className="text-slate-500 text-sm font-medium">Coordinate institutional infrastructure, audit node synchronization and demographic data integrity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
           {[
             { label: 'Network Uptime', value: '100%', status: 'Nominal', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
             { label: 'Active Sessions', value: logs.length + 1282, status: 'Encrypted', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
             { label: 'Storage Cluster', value: '14.2 TB', status: 'Redundant', icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
             { label: 'Response Latency', value: '18ms', status: 'Optimal', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
           ].map(stat => (
             <div key={stat.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-6">
                   <div className={`p-2.5 rounded-lg border ${stat.bg} ${stat.color} ${stat.border}`}>
                      <stat.icon size={18} />
                   </div>
                   <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${stat.bg} ${stat.color} ${stat.border}`}>{stat.status}</div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
             </div>
           ))}

           <div className="md:col-span-1">
             <button 
              onClick={async () => {
                const { seedData } = await import('../lib/seedData');
                await seedData();
                alert("Demo logic initialized successfully.");
              }}
              className="bg-slate-900 text-white w-full h-full p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col items-center justify-center gap-3 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-95 group"
             >
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Zap size={24} className="text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest">Override Seed</div>
                  <p className="text-[9px] text-slate-500 font-medium mt-1 leading-relaxed">Initialize demographic sample set</p>
                </div>
             </button>
           </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
           <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-[10px] flex items-center gap-3 uppercase tracking-widest">
                <Terminal size={14} className="text-blue-600" />
                Immutable Audit Micro-Logs
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Node Polling</span>
              </div>
           </div>
           <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                       <th className="px-8 py-5">Temporal Entry</th>
                       <th className="px-8 py-5">Source Node</th>
                       <th className="px-8 py-5">Operational Directive</th>
                       <th className="px-8 py-5 text-right">Cryptographic Hash</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-8 py-4 whitespace-nowrap text-[11px] font-bold text-slate-500">
                          {log.timestamp ? format(new Date(log.timestamp.seconds * 1000), 'PPP') : '---'} <span className="text-slate-300 ml-2">{log.timestamp ? format(new Date(log.timestamp.seconds * 1000), 'p') : ''}</span>
                        </td>
                        <td className="px-8 py-4">
                           <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:bg-white group-hover:border-slate-300 group-hover:text-slate-900 transition-colors">
                             {log.department}
                           </span>
                        </td>
                        <td className="px-8 py-4">
                           <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full group-hover:animate-ping"></div>
                             {log.action}
                           </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                           <span className="text-[9px] font-mono text-slate-300 font-bold uppercase tracking-wider">0x{log.id?.slice(0, 8).toUpperCase() || 'PROV-31'}</span>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-20 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest">
                           Await synchronization...
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </Layout>
  );
};
