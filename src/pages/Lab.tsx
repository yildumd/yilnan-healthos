import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PatientService } from '../lib/patientService';
import { Patient, LabRequest, UserRole } from '../types';
import { PatientFile } from '../components/PatientFile';
import { 
  Beaker, 
  ChevronRight, 
  Send,
  FileSearch,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Optional role guard
const REQUIRED_ROLE: UserRole = 'Lab Technician';

export const Lab: React.FC<{ userRole?: UserRole }> = ({ userRole }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingLab, setPendingLab] = useState<LabRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState({
    testType: '',
    result: '',
    referenceRange: '',
    comments: '',
    labTechId: 'LAB-TECH-01'
  });

  // Role guard
  if (userRole && userRole !== REQUIRED_ROLE) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
          <div className="p-6 bg-red-50 text-red-600 rounded-full"><ShieldAlert size={48} /></div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-slate-900 uppercase">Access Restricted</h2>
            <p className="text-sm text-slate-500 max-w-xs">Only Lab Technicians can access this page.</p>
          </div>
          <button onClick={() => window.history.back()} className="px-6 py-2 bg-slate-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest">
            Return
          </button>
        </div>
      </Layout>
    );
  }

  // Subscribe to patients waiting for lab (status = 'sent_lab')
  useEffect(() => {
    const unsubQueue = PatientService.subscribeToQueue('sent_lab', setPatients);
    return () => unsubQueue();
  }, []);

  // Subscribe to all patients for manual search
  useEffect(() => {
    const q = query(collection(db, 'patients'), orderBy('fullName'));
    const unsubAll = onSnapshot(q, (snapshot) => {
      setAllPatients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
    });
    return () => unsubAll();
  }, []);

  // Real‑time subscription to selected patient's data (balance, status, etc.)
  useEffect(() => {
    if (!selectedPatient) {
      setSelectedPatientData(null);
      setPendingLab(null);
      return;
    }
    const patientRef = doc(db, 'patients', selectedPatient.id);
    const unsubPatient = onSnapshot(patientRef, (snap) => {
      if (snap.exists()) {
        setSelectedPatientData({ id: snap.id, ...snap.data() } as Patient);
      } else {
        setSelectedPatientData(null);
      }
    });

    // Subscribe to pending lab requests
    const labQuery = query(
      collection(db, `patients/${selectedPatient.id}/labResults`),
      orderBy('timestamp', 'desc')
    );
    const unsubLab = onSnapshot(labQuery, (snapshot) => {
      const labs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LabRequest));
      const currentPending = labs.find(l => l.status === 'pending') || null;
      setPendingLab(currentPending);
      if (currentPending) {
        setResult(prev => ({ ...prev, testType: currentPending.testType }));
      } else {
        // Reset form if no pending
        setResult({ testType: '', result: '', referenceRange: '', comments: '', labTechId: 'LAB-TECH-01' });
      }
    });

    return () => {
      unsubPatient();
      unsubLab();
    };
  }, [selectedPatient]);

  const filteredPatients = allPatients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fileNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmitResult = async () => {
    if (!selectedPatientData || !pendingLab) {
      setError('No pending lab request found.');
      return;
    }
    if (!result.result.trim()) {
      setError('Please enter the test result.');
      return;
    }
    if (!result.referenceRange.trim()) {
      setError('Please enter the reference range.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 1. Update the lab request with results
      const labRef = doc(db, `patients/${selectedPatientData.id}/labResults`, pendingLab.id!);
      await updateDoc(labRef, {
        status: 'completed',
        result: {
          testType: result.testType,
          result: result.result,
          referenceRange: result.referenceRange,
          comments: result.comments,
          labTechId: result.labTechId,
          timestamp: serverTimestamp()
        },
        completedAt: serverTimestamp()
      });

      // 2. Deduct lab fee (e.g., ₦3000)
      const labFee = 3000;
      if ((selectedPatientData.walletBalance || 0) >= labFee) {
        await PatientService.debitAccount(
          selectedPatientData.id,
          labFee,
          `Lab Test: ${result.testType}`,
          result.labTechId,
          undefined // Don't change status here; we'll update after
        );
      } else {
        // Optionally still allow but warn; for strict policy, you might block.
        setError(`Insufficient balance (₦${selectedPatientData.walletBalance?.toLocaleString()}) to cover lab fee of ₦${labFee}.`);
        setSubmitting(false);
        return;
      }

      // 3. Update patient status: after lab, typically goes back to doctor for review
      //    or directly to pharmacy if prescriptions already exist. We'll check if there are any pending prescriptions.
      //    For simplicity, move to 'waiting_doctor' (doctor will then move to pharmacy if needed).
      await PatientService.updateStatus(selectedPatientData.id, 'waiting_doctor', 'Lab Technician');

      // 4. Audit log (already inside debitAccount and updateStatus, but add explicit)
      await PatientService.logAction('Lab Technician', 'Lab Technician', `Completed lab test: ${result.testType} = ${result.result}`, selectedPatientData.id);

      // 5. Reset and close
      setSelectedPatient(null);
      setSelectedPatientData(null);
      setPendingLab(null);
      setResult({ testType: '', result: '', referenceRange: '', comments: '', labTechId: 'LAB-TECH-01' });
    } catch (err: any) {
      setError(err.message || 'Failed to submit lab results. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentPatient = selectedPatientData || selectedPatient;

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Laboratory Investigations</h1>
            <p className="text-slate-500 text-sm font-medium">Coordinate clinical diagnostic procedures and transmit verified results.</p>
          </div>
          <button 
            onClick={() => setShowSearch(true)}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <Beaker size={18} className="text-blue-400" />
            Manual Result Entry
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="font-bold text-slate-700 text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <Beaker size={14} className="text-blue-500" />
                  Investigation Queue
                </h2>
                <span className="text-[10px] font-black text-slate-400">{patients.length} Pending</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {patients.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <CheckCircle2 className="opacity-10 mx-auto mb-2" size={32} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Investigations Clear</p>
                  </div>
                ) : (
                  patients.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedPatient(p)} 
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer group border-l-4 ${selectedPatient?.id === p.id ? 'bg-slate-50 border-blue-600' : 'border-transparent'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors tracking-tight">{p.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.fileNumber}</span>
                        </div>
                        <ChevronRight size={16} className={`transition-all ${selectedPatient?.id === p.id ? 'text-blue-600' : 'text-slate-300'}`} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 text-white relative overflow-hidden group shadow-xl">
              <div className="relative z-10">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-4">Laboratory Standards</p>
                <h3 className="text-lg font-black tracking-tight mb-2">Diagnostic Integrity</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">Verified results are automatically pushed to the physician's assessment node.</p>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                <Beaker size={128} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {currentPatient ? (
                <motion.div 
                  key={currentPatient.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  <PatientFile patientId={currentPatient.id} />
                  
                  {pendingLab ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                      <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                        <h3 className="text-[10px] font-black flex items-center gap-3 uppercase tracking-widest">
                          <FileSearch size={18} className="text-blue-400" />
                          Digital Case Profile: <span className="text-blue-400 font-black">{pendingLab.testType}</span>
                        </h3>
                      </div>
                      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white overflow-y-auto max-h-[500px] scrollbar-hide">
                        {error && (
                          <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-xs">
                            <AlertCircle size={14} />
                            {error}
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Investigation Type</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                            placeholder="e.g. Full Blood Count"
                            value={result.testType}
                            onChange={e => setResult({...result, testType: e.target.value})}
                            disabled={submitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Technician ID / Node</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                            placeholder="e.g. LAB-TECH-01"
                            value={result.labTechId}
                            onChange={e => setResult({...result, labTechId: e.target.value})}
                            disabled={submitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Observed Value / Result *</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                            placeholder="e.g. 5.6 mmol/L"
                            value={result.result}
                            onChange={e => setResult({...result, result: e.target.value})}
                            required
                            disabled={submitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Reference Standard *</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                            placeholder="e.g. 3.5 - 6.0 mmol/L"
                            value={result.referenceRange}
                            onChange={e => setResult({...result, referenceRange: e.target.value})}
                            required
                            disabled={submitting}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Specialist Remarks</label>
                          <textarea 
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm italic text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                            placeholder="Detail any specific anomalies during investigation..."
                            value={result.comments}
                            onChange={e => setResult({...result, comments: e.target.value})}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                      <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HL7 Diagnostic Link Active</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => setSelectedPatient(null)}
                            className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 disabled:opacity-50"
                            disabled={submitting}
                          >
                            Suspend
                          </button>
                          <button 
                            onClick={handleSubmitResult}
                            disabled={submitting}
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                            {submitting ? 'Processing...' : 'Authorize & Synchronize'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 rounded-xl bg-slate-900 flex items-center gap-6 shadow-2xl border border-white/5">
                      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                        <AlertCircle size={32} className="text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-black text-lg tracking-tight">Missing Directives</h4>
                        <p className="text-slate-500 text-xs font-medium leading-relaxed uppercase tracking-widest mt-1">Patient is on investigation queue but requires specific physician test order.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="h-full min-h-[500px] border border-slate-200 rounded-3xl flex flex-col items-center justify-center p-20 text-center bg-slate-50/30 shadow-inner">
                  <div className="w-20 h-20 bg-white rounded-3xl border border-slate-100 flex items-center justify-center mb-8 shadow-xl shadow-slate-200/50">
                    <Beaker size={40} className="text-slate-200" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Special Investigations Portal</h3>
                  <p className="text-slate-500 max-w-sm mt-2 text-sm font-medium leading-relaxed">Authorized laboratory investigations queued for fulfillment. Results are instantly transmitted to patient EMR upon authorization.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Manual Entry Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-800/10"
            >
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-blue-400 shadow-lg">
                    <Search size={20} />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Diagnostic Node Search</h2>
                </div>
                <button 
                  onClick={() => setShowSearch(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Search Laboratory Registry (File # or Name)..." 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all shadow-inner"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {filteredPatients.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching diagnostic records</p>
                    </div>
                  ) : (
                    filteredPatients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setShowSearch(false);
                          setSearchTerm('');
                        }}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-all group"
                      >
                        <div className="flex items-center gap-4 text-left">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-slate-900 group-hover:text-blue-400 transition-all">
                            {p.fullName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 leading-none mb-1">{p.fullName}</p>
                            <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">{p.fileNumber}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-all transform group-hover:translate-x-1" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};