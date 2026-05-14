import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PatientService } from '../lib/patientService';
import { Patient, Vitals, UserRole } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PatientFile } from '../components/PatientFile';
import { 
  HeartPulse, 
  ChevronRight, 
  X,
  Stethoscope,
  Activity,
  Droplets,
  Scale,
  Thermometer,
  Send,
  History,
  Search,
  UserPlus,
  FileText,
  Loader2,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Optional: Role guard – only Nurses should access
const REQUIRED_ROLE: UserRole = 'Nurse';

export const Nursing: React.FC<{ userRole?: UserRole }> = ({ userRole }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [vitals, setVitals] = useState({
    bp: '',
    temp: '',
    pulse: '',
    weight: '',
    observations: ''
  });

  // Role guard
  if (userRole && userRole !== REQUIRED_ROLE) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
          <div className="p-6 bg-red-50 text-red-600 rounded-full"><ShieldAlert size={48} /></div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-slate-900 uppercase">Access Restricted</h2>
            <p className="text-sm text-slate-500 max-w-xs">Only Nurses can access the Nursing queue.</p>
          </div>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest">
            Return to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  // Subscribe to patients waiting for nursing (status = 'ready_nursing')
  useEffect(() => {
    const unsubQueue = PatientService.subscribeToQueue('ready_nursing', setPatients);
    return () => unsubQueue();
  }, []);

  // Subscribe to all patients for manual search (global registry)
  useEffect(() => {
    const q = query(collection(db, 'patients'), orderBy('fullName'));
    const unsubAll = onSnapshot(q, (snapshot) => {
      setAllPatients(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
    });
    return () => unsubAll();
  }, []);

  // Real‑time subscription to selected patient's data (to reflect status changes)
  useEffect(() => {
    if (!selectedPatient) {
      setSelectedPatientData(null);
      return;
    }
    const patientRef = doc(db, 'patients', selectedPatient.id);
    const unsub = onSnapshot(patientRef, (snap) => {
      if (snap.exists()) {
        setSelectedPatientData({ id: snap.id, ...snap.data() } as Patient);
      } else {
        setSelectedPatientData(null);
      }
    });
    return () => unsub();
  }, [selectedPatient]);

  const filteredPatients = allPatients.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fileNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validateVitals = () => {
    if (!vitals.bp.match(/^\d{2,3}\/\d{2,3}$/)) {
      setError('Blood pressure must be in format e.g., 120/80');
      return false;
    }
    const temp = parseFloat(vitals.temp);
    if (isNaN(temp) || temp < 30 || temp > 45) {
      setError('Temperature must be between 30°C and 45°C');
      return false;
    }
    const pulse = parseInt(vitals.pulse);
    if (isNaN(pulse) || pulse < 30 || pulse > 200) {
      setError('Pulse must be between 30 and 200 BPM');
      return false;
    }
    const weight = parseFloat(vitals.weight);
    if (isNaN(weight) || weight < 1 || weight > 300) {
      setError('Weight must be between 1 and 300 kg');
      return false;
    }
    if (!vitals.observations.trim()) {
      setError('Observations are required');
      return false;
    }
    return true;
  };

  const handleSubmitVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientData || submitting) return;
    if (!validateVitals()) return;

    setSubmitting(true);
    setError('');

    try {
      // Add vitals using the service
      await PatientService.addVitals(selectedPatientData.id, {
        bp: vitals.bp,
        temp: parseFloat(vitals.temp),
        pulse: parseInt(vitals.pulse),
        weight: parseFloat(vitals.weight),
        observations: vitals.observations,
        nurseId: 'NURSE_01', // In real app, get from auth context
      });

      // Update patient status to 'waiting_doctor'
      await PatientService.updateStatus(selectedPatientData.id, 'waiting_doctor', 'Nurse');

      // Clear form and close panel
      setSelectedPatient(null);
      setSelectedPatientData(null);
      setVitals({ bp: '', temp: '', pulse: '', weight: '', observations: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to submit vitals. Please try again.');
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nursing & Vitals</h1>
            <p className="text-slate-500 text-sm font-medium">Capture biometric vital signs and initial clinical observations.</p>
          </div>
          <button 
            onClick={() => setShowSearch(true)}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <Stethoscope size={18} className="text-blue-400" />
            Manual Clinical Entry
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Queue */}
          <div className="lg:col-span-1 space-y-4">
             <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-bold text-slate-700 text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <History size={14} className="text-blue-500" />
                    Nursing Queue
                  </h2>
                  <span className="text-[10px] font-black text-slate-400">{patients.length} Waiting</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto scrollbar-hide">
                   {patients.length === 0 ? (
                     <div className="p-16 text-center text-slate-400">
                        <Activity className="opacity-10 mx-auto mb-2" size={32} />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Clear Queue</p>
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
                               <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{p.fullName}</span>
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
                   <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-4">Department Protocol</p>
                   <h3 className="text-lg font-black tracking-tight mb-2">Clinical Accuracy</h3>
                   <p className="text-slate-400 text-xs leading-relaxed font-medium">Verify patient identity before logging vitals. Accuracy is critical for diagnosis.</p>
                </div>
                <HeartPulse className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
             </div>
          </div>

          {/* Action Center */}
          <div className="lg:col-span-2">
             <AnimatePresence mode="wait">
               {currentPatient ? (
                 <motion.div 
                   key={currentPatient.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, x: -10 }}
                   className="space-y-6"
                 >
                    <PatientFile patientId={currentPatient.id} />

                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                       <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                          <h3 className="text-sm font-bold flex items-center gap-3 uppercase tracking-widest">
                             <Activity size={18} className="text-blue-400" />
                             Biometric Intake Form
                          </h3>
                       </div>
                       
                       <form onSubmit={handleSubmitVitals} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white overflow-y-auto max-h-[500px] scrollbar-hide">
                          {error && (
                            <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-xs">
                              <AlertCircle size={14} />
                              {error}
                            </div>
                          )}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Blood Pressure (mmHg) *</label>
                            <input 
                              required
                              type="text" 
                              placeholder="e.g. 120/80" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                              value={vitals.bp}
                              onChange={e => { setVitals({...vitals, bp: e.target.value}); setError(''); }}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Body Temp (°C) *</label>
                            <input 
                              required
                              type="number" 
                              step="0.1"
                              placeholder="e.g. 36.5" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                              value={vitals.temp}
                              onChange={e => { setVitals({...vitals, temp: e.target.value}); setError(''); }}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Heart Pulse (BPM) *</label>
                            <input 
                              required
                              type="number" 
                              placeholder="e.g. 72" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                              value={vitals.pulse}
                              onChange={e => { setVitals({...vitals, pulse: e.target.value}); setError(''); }}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Body Weight (KG) *</label>
                            <input 
                              required
                              type="number" 
                              step="0.1"
                              placeholder="e.g. 70.5" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                              value={vitals.weight}
                              onChange={e => { setVitals({...vitals, weight: e.target.value}); setError(''); }}
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Observations & Complaints *</label>
                            <textarea 
                              required
                              rows={4}
                              placeholder="Note patient complaints or physical observations..."
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm italic text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                              value={vitals.observations}
                              onChange={e => { setVitals({...vitals, observations: e.target.value}); setError(''); }}
                            />
                          </div>
                       </form>

                       <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Biometric Link Active</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <button 
                               disabled={submitting}
                               type="button"
                               onClick={() => {
                                 setSelectedPatient(null);
                                 setError('');
                                 setVitals({ bp: '', temp: '', pulse: '', weight: '', observations: '' });
                               }}
                               className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 disabled:opacity-50"
                             >
                               Cancel
                             </button>
                             <button 
                               disabled={submitting}
                               onClick={handleSubmitVitals}
                               type="submit"
                               className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                               {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                               {submitting ? "Processing..." : "Authorize & Push to Physician"}
                             </button>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               ) : (
                 <div className="h-full min-h-[500px] border border-slate-200 rounded-3xl flex flex-col items-center justify-center p-20 text-center bg-slate-50/30 shadow-inner">
                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-24 h-24 bg-white rounded-3xl border border-slate-100 flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50"
                    >
                      <HeartPulse size={48} className="text-slate-200" />
                    </motion.div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Vitals Queue</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2 text-sm font-medium leading-relaxed">Select a patient from the authorized queue to initialize biometric capture and vital sign tracking.</p>
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
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Record Node Entry</h2>
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
                    placeholder="Search Global Registry (File # or Name)..." 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all shadow-inner"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {filteredPatients.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching patient nodes</p>
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