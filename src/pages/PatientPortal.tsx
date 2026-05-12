import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  ArrowLeft, 
  Search, 
  Activity, 
  History, 
  User, 
  CreditCard,
  AlertCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Patient, Transaction } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const PatientPortal: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPatient(null);
    
    try {
      const q = query(
        collection(db, 'patients'), 
        where('fileNumber', '==', searchQuery.toUpperCase().trim())
      );
      
      let snapshot = await getDocs(q);
      
      // If not found by file number, try phone
      if (snapshot.empty) {
        const qPhone = query(
          collection(db, 'patients'), 
          where('phoneNumber', '==', searchQuery.trim())
        );
        snapshot = await getDocs(qPhone);
      }

      if (snapshot.empty) {
        alert("Patient record not found. Please check your File Number or Phone.");
      } else {
        const pData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Patient;
        setPatient(pData);
        
        // Subscribe to real-time updates for this patient
        onSnapshot(doc(db, 'patients', pData.id), (doc) => {
          setPatient({ id: doc.id, ...doc.data() } as Patient);
        });

        // Fetch transactions
        const txQ = query(
          collection(db, `patients/${pData.id}/transactions`),
          orderBy('timestamp', 'desc')
        );
        onSnapshot(txQ, (snap) => {
          setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
        });
      }
    } catch (error) {
      alert("Lookup failed: " + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Exit Portal</span>
        </button>

        <div className="mb-12">
           <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Digital <span className="text-blue-600">Wallet</span></h1>
           <p className="text-slate-500 text-sm font-medium">Verify your clinical status, balance, and transaction history.</p>
        </div>

        {!patient ? (
          <div className="max-w-md">
            <motion.form 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onSubmit={handleLookup}
              className="bg-white rounded-3xl p-10 shadow-2xl border border-slate-100"
            >
              <div className="mb-8">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                    <Search size={24} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-900 mb-2">Identify Patient Node</h2>
                 <p className="text-xs text-slate-400 font-medium">Enter your hospital file number or registered phone number to authenticate.</p>
              </div>

              <div className="space-y-4">
                 <div className="relative">
                    <input 
                      required
                      type="text"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black tracking-tight focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner"
                      placeholder="FILE-XXXXXX or Phone"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                 </div>
                 <button 
                  disabled={loading}
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                 >
                    {loading ? "Authenticating..." : "Access Data Hub"}
                 </button>
              </div>

              <div className="mt-8 flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl text-[10px] text-orange-700 font-bold italic">
                 <AlertCircle size={14} />
                 Only existing patients with an authorized profile can access this node.
              </div>
            </motion.form>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                  <div className="relative z-10">
                     <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Authenticated Wallet</p>
                     <h2 className="text-3xl font-black tracking-tighter mb-8">₦{patient.walletBalance.toLocaleString()}</h2>
                     
                     <div className="space-y-4">
                        <div className="flex justify-between items-center border-t border-white/5 pt-4">
                           <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">File Number</span>
                           <span className="text-xs font-black text-blue-300">{patient.fileNumber}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-4">
                           <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Active Status</span>
                           <StatusBadge status={patient.status} />
                        </div>
                     </div>
                  </div>
                  <Wallet size={120} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" strokeWidth={1} />
               </div>

               <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <User size={16} />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Demographic Data</span>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Full Identity</p>
                        <p className="text-xs font-bold text-slate-800">{patient.fullName}</p>
                     </div>
                     <div>
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Blood Group</p>
                        <p className="text-xs font-bold text-slate-800">{patient.bloodGroup || 'Not Recorded'}</p>
                     </div>
                     <div>
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Registered Contact</p>
                        <p className="text-xs font-bold text-slate-800">{patient.phoneNumber}</p>
                     </div>
                  </div>
               </div>

               <button 
                 onClick={() => { setPatient(null); setSearchQuery(''); }}
                 className="w-full py-4 bg-slate-100 text-slate-500 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
               >
                  Disconnect Identity
               </button>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-3">
                        <History size={16} className="text-blue-600" />
                        Audit Ledger (Transactions)
                     </h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                     {transactions.length === 0 ? (
                        <div className="p-20 text-center">
                           <FileText className="mx-auto mb-4 text-slate-200" size={48} />
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No activity detected on this file node.</p>
                        </div>
                     ) : (
                        transactions.map(tx => (
                           <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'deposit' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {tx.type === 'deposit' ? <Activity size={20} /> : <CreditCard size={20} />}
                                 </div>
                                 <div>
                                    <p className="text-xs font-bold text-slate-900">{tx.description}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                       {tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleString() : 'Processing...'}
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className={`text-lg font-black tracking-tighter ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {tx.type === 'deposit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                                 </p>
                                 <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Verified Transaction</p>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
               
               <div className="p-8 bg-blue-50 border border-blue-100 rounded-3xl">
                  <div className="flex gap-4">
                     <Activity className="text-blue-600 shrink-0" size={24} />
                     <div>
                        <h4 className="text-sm font-bold text-blue-900 mb-1">Clinical Synchronization Active</h4>
                        <p className="text-xs text-blue-700 font-medium leading-relaxed">Your wallet balance is synchronized with the hospital pharmacy, lab, and main clinic. Any clinical orders from doctors will automatically appear in your ledger upon settlement.</p>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Internal components
