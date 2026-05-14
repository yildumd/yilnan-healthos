import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PatientService } from '../lib/patientService';
import { Patient, Transaction, PatientStatus, UserRole } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  History, 
  Plus, 
  X,
  CreditCard,
  Receipt,
  AlertCircle,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

// Optional: Role guard – only Accounts should access
const REQUIRED_ROLE: UserRole = 'Accounts';

export const Accounts: React.FC<{ userRole?: UserRole }> = ({ userRole }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState('');
  const [actionType, setActionType] = useState<'fund' | 'debit' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Role guard
  if (userRole && userRole !== REQUIRED_ROLE) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
          <div className="p-6 bg-red-50 text-red-600 rounded-full"><ShieldAlert size={48} /></div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-slate-900 uppercase">Access Restricted</h2>
            <p className="text-sm text-slate-500 max-w-xs">Only Accounts officers can access this page.</p>
          </div>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest">
            Return to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  // Subscribe to patients waiting for payment
  useEffect(() => {
    const unsubQueue = PatientService.subscribeToQueue('waiting_payment', setPatients);
    return () => unsubQueue();
  }, []);

  // Real‑time subscription to selected patient's data (for live balance updates)
  useEffect(() => {
    if (!selectedPatient) {
      setSelectedPatientData(null);
      setTransactions([]);
      return;
    }

    // Subscribe to patient document changes
    const patientRef = doc(db, 'patients', selectedPatient.id);
    const unsubPatient = onSnapshot(patientRef, (snap) => {
      if (snap.exists()) {
        setSelectedPatientData({ id: snap.id, ...snap.data() } as Patient);
      } else {
        setSelectedPatientData(null);
      }
    });

    // Subscribe to transactions subcollection
    const q = query(
      collection(db, `patients/${selectedPatient.id}/transactions`),
      orderBy('timestamp', 'desc')
    );
    const unsubTx = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    return () => {
      unsubPatient();
      unsubTx();
    };
  }, [selectedPatient]);

  const handleTransaction = async () => {
    if (!selectedPatientData || !amount) {
      setError('Please enter an amount');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    if (actionType === 'debit' && val > (selectedPatientData.walletBalance || 0)) {
      setError(`Insufficient funds. Balance: ₦${selectedPatientData.walletBalance?.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (actionType === 'fund') {
        // Fund wallet
        await PatientService.fundWallet(selectedPatientData.id, val, 'ACCOUNTS_STAFF');
        // After funding, if patient status is still 'waiting_payment', move to 'ready_nursing'
        if (selectedPatientData.status === 'waiting_payment') {
          await PatientService.updateStatus(selectedPatientData.id, 'ready_nursing', 'Accounts');
        }
      } else {
        // Debit (e.g., consultation fee, lab fee, pharmacy fee)
        // You can customise the description and next status based on the current workflow stage
        let description = 'Service Fee';
        let nextStatus: PatientStatus | undefined = undefined;
        // Optional: determine next status based on current status
        if (selectedPatientData.status === 'waiting_doctor') {
          description = 'Consultation Fee';
          nextStatus = 'sent_lab'; // after consultation, go to lab (or pharmacy)
        } else if (selectedPatientData.status === 'sent_lab') {
          description = 'Lab Investigation Fee';
          nextStatus = 'at_pharmacy';
        } else if (selectedPatientData.status === 'at_pharmacy') {
          description = 'Pharmacy Dispensing Fee';
          nextStatus = 'completed';
        } else {
          description = 'Hospital Service Fee';
          // If patient is still in waiting_payment, after debit you might want to move to ready_nursing?
          // But typically debit occurs after service, so leave status unchanged or move to next stage.
          if (selectedPatientData.status === 'waiting_payment') {
            nextStatus = 'ready_nursing';
          }
        }
        await PatientService.debitAccount(
          selectedPatientData.id,
          val,
          description,
          'ACCOUNTS_STAFF',
          nextStatus
        );
      }
      // Reset form
      setAmount('');
      setActionType(null);
      // Optionally clear selected patient if transaction was a debit that moved them out of waiting_payment
      if (actionType === 'debit' && selectedPatientData.status === 'waiting_payment') {
        setSelectedPatient(null);
      }
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format Firestore timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentPatient = selectedPatientData || selectedPatient;

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Accounts</h1>
          <p className="text-slate-500 text-sm font-medium">Manage institutional revenue, patient liquidity, and digital wallet settlements.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Billing Queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="font-bold text-slate-700 text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={14} className="text-blue-500" />
                  Electronic Payment Queue
                </h2>
                <span className="text-[10px] font-black text-slate-400">{patients.length} Pending Actions</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto scrollbar-hide">
                {patients.length === 0 ? (
                  <div className="p-20 text-center text-slate-400">
                    <Receipt className="mx-auto mb-4 opacity-10" size={48} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Revenue Cycle Clear</p>
                  </div>
                ) : (
                  patients.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedPatient(p)}
                      className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group border-l-4 ${selectedPatient?.id === p.id ? 'bg-slate-50 border-blue-600' : 'border-transparent'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${(p.walletBalance || 0) < 2000 ? 'bg-orange-50 border-orange-100 text-orange-500' : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-500'}`}>
                          {(p.walletBalance || 0) < 2000 ? <AlertCircle size={20} /> : <Wallet size={20} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm tracking-tight">{p.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.fileNumber}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900 tracking-tighter">₦{(p.walletBalance || 0).toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Liquid Balance</div>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Wallet Action Panel */}
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {currentPatient ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
                >
                  <div className="p-6 bg-slate-900 text-white relative">
                    <button 
                      onClick={() => setSelectedPatient(null)}
                      className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Financial Controller</p>
                    <h3 className="text-xl font-black tracking-tight mb-6">{currentPatient.fullName}</h3>
                    
                    <div className="bg-white/5 border border-white/5 rounded-xl p-5 flex items-center justify-between shadow-inner">
                      <div>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Authenticated Credits</p>
                        <p className="text-2xl font-black tracking-tighter">₦{(currentPatient.walletBalance || 0).toLocaleString()}</p>
                      </div>
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                        <Wallet className="text-blue-400" size={24} />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex gap-2">
                       <button 
                        onClick={() => { setActionType('fund'); setError(''); }}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-black uppercase tracking-widest text-[9px] ${actionType === 'fund' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-50 bg-slate-50 hover:border-slate-200 text-slate-500'}`}
                       >
                         <ArrowUpCircle size={20} />
                         Deposit
                       </button>
                       <button 
                        onClick={() => { setActionType('debit'); setError(''); }}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-black uppercase tracking-widest text-[9px] ${actionType === 'debit' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-50 bg-slate-50 hover:border-slate-200 text-slate-500'}`}
                       >
                         <ArrowDownCircle size={20} />
                         Debit Fee
                       </button>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-xs">
                        <AlertCircle size={14} />
                        {error}
                      </div>
                    )}

                    {actionType && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-4 overflow-hidden"
                      >
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 px-1">Transaction Value (₦)</label>
                            <input 
                              type="number"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner placeholder:text-slate-300 tracking-tighter"
                            />
                         </div>
                         <button 
                          onClick={handleTransaction}
                          disabled={submitting}
                          className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${actionType === 'fund' ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700 active:scale-95' : 'bg-red-600 text-white shadow-red-100 hover:bg-red-700 active:scale-95'}`}
                         >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : (actionType === 'fund' ? <Plus size={16} /> : <Receipt size={16} />)}
                            {submitting ? 'Processing...' : `Authorize ${actionType === 'fund' ? 'Deposit' : 'Debit'}`}
                         </button>
                      </motion.div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Audit Ledger</h3>
                        <History size={14} className="text-slate-300" />
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-hide">
                        {transactions.length === 0 ? (
                           <p className="text-[10px] text-slate-400 italic text-center py-4">No recent activity logged.</p>
                        ) : (
                          transactions.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                               <div className="flex items-center gap-3">
                                 <div className={`p-1.5 rounded-lg ${tx.type === 'deposit' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                   {tx.type === 'deposit' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                 </div>
                                 <div className="flex flex-col">
                                   <span className="text-[10px] font-black text-slate-800 tracking-tight">{tx.description}</span>
                                   <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{formatTimestamp(tx.timestamp)}</span>
                                 </div>
                               </div>
                               <span className={`text-[10px] font-black tracking-tighter ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {tx.type === 'deposit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                               </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl h-[500px] flex flex-col items-center justify-center p-12 text-center shadow-inner">
                  <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 flex items-center justify-center mb-6 text-slate-200 shadow-xl shadow-slate-200/50">
                    <Wallet size={36} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Institutional Cash Desk</h3>
                  <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-widest font-bold leading-relaxed max-w-[200px]">Select a patient file to initialize financial operations and digital wallet settlements.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
};