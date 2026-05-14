import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PatientService } from '../lib/patientService';
import { Patient } from '../types';
import { PatientFile } from '../components/PatientFile';
import { 
  Stethoscope, 
  ChevronRight, 
  X,
  History,
  ClipboardCheck,
  Plus,
  Send,
  Beaker,
  Pill,
  CalendarDays,
  Search,
  Database,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const Doctor: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'notes' | 'lab' | 'pharmacy'>('notes');
  
  // Search & Manual Entry state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [consultation, setConsultation] = useState({
    diagnosis: '',
    treatmentPlan: '',
    clinicalNotes: '',
    nurseDirective: '',
    labDirective: '',
    pharmacyDirective: '',
    accountsDirective: ''
  });
  
  const [labRequest, setLabRequest] = useState('');
  const [prescription, setPrescription] = useState<string[]>([]);
  const [newDrug, setNewDrug] = useState('');

  useEffect(() => {
    const unsubQueue = PatientService.subscribeToQueue('waiting_doctor', setPatients);
    return () => unsubQueue();
  }, []);

  const addDrug = () => {
    if (newDrug.trim()) {
      setPrescription([...prescription, newDrug.trim()]);
      setNewDrug('');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const q = query(
        collection(db, 'patients'),
        where('fullName', '>=', searchQuery),
        where('fullName', '<=', searchQuery + '\uf8ff'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSaveNotesOnly = async () => {
    if (!selectedPatient) return;
    if (!consultation.diagnosis) {
      alert("Please enter a diagnosis before saving.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, `patients/${selectedPatient.id}/consultations`), {
        ...consultation,
        doctorId: 'DR_YILNAN',
        timestamp: serverTimestamp()
      });
      alert("Consultation record saved successfully.");
    } catch (error) {
      alert("Error saving consultation: " + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitConsultation = async () => {
    if (!selectedPatient) return;

    setLoading(true);
    try {
      // 1. Save clinical notes & directives
      await addDoc(collection(db, `patients/${selectedPatient.id}/consultations`), {
        ...consultation,
        doctorId: 'DR_YILNAN',
        timestamp: serverTimestamp()
      });

      // 2. Save Lab Request if any
      if (labRequest) {
        await addDoc(collection(db, `patients/${selectedPatient.id}/labResults`), {
          testType: labRequest,
          status: 'pending',
          doctorId: 'DR_YILNAN',
          timestamp: serverTimestamp()
        });
      }

      // 3. Save Prescription if any
      if (prescription.length > 0) {
        await addDoc(collection(db, `patients/${selectedPatient.id}/prescriptions`), {
          medications: prescription,
          status: 'pending',
          doctorId: 'DR_YILNAN',
          timestamp: serverTimestamp()
        });
      }

      // 4. Update status
      let nextStatus: any = 'completed';
      if (labRequest) nextStatus = 'sent_lab';
      else if (prescription.length > 0) nextStatus = 'at_pharmacy';

      await PatientService.updateStatus(selectedPatient.id, nextStatus, 'Doctor');
      
      // Reset
      setLoading(false);
      setSelectedPatient(null);
      setConsultation({ 
        diagnosis: '', 
        treatmentPlan: '', 
        clinicalNotes: '',
        nurseDirective: '',
        labDirective: '',
        pharmacyDirective: '',
        accountsDirective: ''
      });
      setLabRequest('');
      setPrescription([]);
    } catch (error) {
      alert("Error submitting consultation: " + (error as any).message);
    }
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Physician <span className="text-purple-600">Portal</span></h1>
            <p className="text-slate-500 text-sm font-medium">Full clinical evaluation including investigations and pharmaceutical nodes.</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setShowSearchModal(true)}
               className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all"
             >
                <Search size={14} />
                Find Patient
             </button>
             <div className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-800 flex items-center gap-2 shadow-xl shadow-slate-200/50">
               <Stethoscope size={14} className="text-purple-400" />
               DR. YILNAN
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Patients Queue */}
          <div className="lg:col-span-1 space-y-4">
             <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-bold text-slate-700 text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <History size={14} className="text-purple-600" />
                    Consultation Queue
                  </h2>
                  <span className="text-[10px] font-black text-slate-400">{patients.length} Waiting</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto scrollbar-hide">
                   {patients.length === 0 ? (
                     <div className="p-16 text-center text-slate-400">
                        <CalendarDays className="opacity-10 mx-auto mb-2" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest">No Waiting</p>
                     </div>
                   ) : (
                     patients.map(p => (
                       <div 
                        key={p.id} 
                        onClick={() => setSelectedPatient(p)}
                        className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer group border-l-4 ${selectedPatient?.id === p.id ? 'bg-slate-50 border-purple-600' : 'border-transparent'}`}
                       >
                          <div className="flex items-center justify-between">
                             <div className="flex flex-col">
                               <span className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">{p.fullName}</span>
                               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.fileNumber}</span>
                             </div>
                             <ChevronRight size={16} className={`transition-all ${selectedPatient?.id === p.id ? 'text-purple-600' : 'text-slate-300'}`} />
                          </div>
                       </div>
                     ))
                   )}
                </div>
             </div>
          </div>

          {/* Action Center */}
          <div className="lg:col-span-3">
             <AnimatePresence mode="wait">
               {selectedPatient ? (
                 <motion.div 
                   key={selectedPatient.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.98 }}
                   className="space-y-6"
                 >
                    <PatientFile patientId={selectedPatient.id} />

                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                       <div className="bg-slate-900 border-b border-white/5 flex px-4 shrink-0">
                          {[
                            { id: 'notes', label: 'Clinical Assessment', icon: ClipboardCheck },
                            { id: 'lab', label: 'Special Investigations', icon: Beaker },
                            { id: 'pharmacy', label: 'E-Prescriptions', icon: Pill }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveSubTab(tab.id as any)}
                              className={`flex items-center gap-2 py-4 px-6 text-[10px] font-black uppercase tracking-widest relative transition-all ${
                                activeSubTab === tab.id ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              <tab.icon size={14} />
                              {tab.label}
                              {activeSubTab === tab.id && (
                                <motion.div layoutId="consult-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
                              )}
                            </button>
                          ))}
                       </div>

                       <div className="p-8 bg-white overflow-y-auto max-h-[500px] scrollbar-hide">
                          {activeSubTab === 'notes' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-8">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="space-y-6">
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Physician Diagnosis</label>
                                       <textarea 
                                         required
                                         rows={2}
                                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all text-sm shadow-inner placeholder:text-slate-300"
                                         placeholder="Enter primary clinical diagnosis..."
                                         value={consultation.diagnosis}
                                         onChange={e => setConsultation({...consultation, diagnosis: e.target.value})}
                                       />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Clinical Progress Notes</label>
                                      <textarea 
                                        rows={10}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm italic text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                                        placeholder="Detailed history, symptoms, and examination findings..."
                                        value={consultation.clinicalNotes}
                                        onChange={e => setConsultation({...consultation, clinicalNotes: e.target.value})}
                                      />
                                    </div>
                                 </div>
                                 <div className="space-y-6">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Management & Treatment Plan</label>
                                      <textarea 
                                        rows={14}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                                        placeholder="Detail therapeutic interventions, patient advice, and follow-up schedules..."
                                        value={consultation.treatmentPlan}
                                        onChange={e => setConsultation({...consultation, treatmentPlan: e.target.value})}
                                      />
                                    </div>
                                 </div>
                               </div>

                               <div className="pt-8 border-t border-slate-100">
                                  <div className="flex items-center justify-between mb-6 px-1">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Administrative & Station Orders</h4>
                                    <span className="text-[9px] text-slate-400 font-bold">DEPARTMENTAL DIRECTIVES</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">To: Nursing Station</label>
                                        <input 
                                          type="text"
                                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                                          placeholder="Nurse instructions..."
                                          value={consultation.nurseDirective}
                                          onChange={e => setConsultation({...consultation, nurseDirective: e.target.value})}
                                        />
                                     </div>
                                     <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">To: Accounts / Billing</label>
                                        <input 
                                          type="text"
                                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                                          placeholder="Billing instructions..."
                                          value={consultation.accountsDirective}
                                          onChange={e => setConsultation({...consultation, accountsDirective: e.target.value})}
                                        />
                                     </div>
                                  </div>
                               </div>
                            </div>
                          )}

                          {activeSubTab === 'lab' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                               <div className="p-10 rounded-2xl bg-blue-50/50 border border-blue-100/50 flex flex-col items-center text-center">
                                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                                    <Beaker className="text-blue-600" size={32} />
                                  </div>
                                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Enterprise Lab Order</h4>
                                  <p className="text-slate-500 text-xs max-w-sm mt-2 font-medium leading-relaxed uppercase tracking-widest">Electronic investigation request for synchronization with pathology.</p>
                                  
                                  <div className="mt-8 w-full max-w-md">
                                     <select 
                                      className="w-full px-6 py-4 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-xl shadow-slate-200/50 mb-4"
                                      value={labRequest}
                                      onChange={e => setLabRequest(e.target.value)}
                                     >
                                        <option value="">-- Select Diagnostic Panel --</option>
                                        <option>Full Blood Count (FBC)</option>
                                        <option>Malaria Parasite (MP)</option>
                                        <option>Widal Serology</option>
                                        <option>Urinalysis Micro</option>
                                        <option>FBS (Fasting Blood Sugar)</option>
                                        <option>Liver Profile (LFT)</option>
                                        <option>Renal Status (KFT)</option>
                                        <option>Electrolytes / Urea / Creatinine</option>
                                     </select>
                                     
                                     <input 
                                      type="text"
                                      className="w-full px-6 py-4 rounded-xl bg-white border border-slate-200 font-bold text-sm text-slate-900 outline-none focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                                      placeholder="Specific instructions for Lab Tech..."
                                      value={consultation.labDirective}
                                      onChange={e => setConsultation({...consultation, labDirective: e.target.value})}
                                     />
                                  </div>
                               </div>
                            </div>
                          )}

                          {activeSubTab === 'pharmacy' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
                               <div className="p-8 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-8">
                                  <div className="flex-1 space-y-4">
                                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Medication Authorizer</h4>
                                     <div className="flex gap-2">
                                        <input 
                                          type="text"
                                          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold text-sm bg-white placeholder:text-slate-300"
                                          placeholder="Enter Drug (e.g. Paracetamol 500mg TDS)"
                                          value={newDrug}
                                          onChange={e => setNewDrug(e.target.value)}
                                          onKeyPress={e => e.key === 'Enter' && addDrug()}
                                        />
                                        <button 
                                         onClick={addDrug}
                                         className="w-12 h-12 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center shrink-0"
                                        >
                                          <Plus size={20} />
                                        </button>
                                     </div>
                                     <div className="space-y-2 pt-4">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Pharmacist Directives</label>
                                        <input 
                                          type="text"
                                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-300"
                                          placeholder="Compounding or dispensing notes..."
                                          value={consultation.pharmacyDirective}
                                          onChange={e => setConsultation({...consultation, pharmacyDirective: e.target.value})}
                                        />
                                     </div>
                                  </div>
                                  
                                  <div className="flex-1">
                                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Current Prescription List</div>
                                     <div className="space-y-2 min-h-32">
                                        {prescription.length === 0 ? (
                                          <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                             <Pill size={24} className="mb-2 opacity-10" />
                                             Empty Prescription
                                          </div>
                                        ) : (
                                          prescription.map((d, i) => (
                                            <div key={i} className="px-4 py-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between group shadow-sm">
                                               <span className="text-sm font-bold text-slate-900">{d}</span>
                                               <button 
                                                onClick={() => setPrescription(prescription.filter((_, idx) => idx !== i))}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                               >
                                                  <X size={14} />
                                                </button>
                                            </div>
                                          ))
                                        )}
                                     </div>
                                  </div>
                               </div>
                            </div>
                          )}

                          <div className="mt-12 flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-100 gap-6">
                             <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                   <div className={`w-2 h-2 rounded-full ${labRequest ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-200'}`}></div>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diagnostics: {labRequest ? 'ACTIVE' : 'NONE'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                   <div className={`w-2 h-2 rounded-full ${prescription.length ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200'}`}></div>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pharmacy: {prescription.length > 0 ? `${prescription.length} ITEMS` : 'NONE'}</span>
                                </div>
                             </div>

                             <div className="flex items-center gap-3 w-full md:w-auto">
                                <button 
                                  onClick={handleSaveNotesOnly}
                                  disabled={loading}
                                  className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                                >
                                  {loading && activeSubTab === 'notes' ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
                                  Save Consultation
                                </button>
                                <button 
                                  onClick={() => setSelectedPatient(null)}
                                  className="flex-1 md:flex-none px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200"
                                >
                                  Suspend Case
                                </button>
                                <button 
                                 onClick={handleSubmitConsultation}
                                 disabled={loading}
                                 className="flex-[2] md:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
                                >
                                  {loading && activeSubTab !== 'notes' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                  Submit & Update Workflow
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               ) : (
                 <div className="h-full min-h-[600px] border border-slate-200 rounded-3xl flex flex-col items-center justify-center p-20 text-center bg-slate-50/30 shadow-inner">
                    <div className="w-20 h-20 bg-white rounded-3xl border border-slate-100 flex items-center justify-center mb-8 shadow-xl shadow-slate-200/50">
                      <Stethoscope size={40} className="text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Staff Physician Portal</h3>
                    <p className="text-slate-500 max-w-sm mt-2 text-sm leading-relaxed font-medium">Select a patient from the consultation queue to initialize clinical review and diagnostic planning.</p>
                    
                    <div className="mt-12 flex gap-4">
                       <div className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">HIPAA Compliance Active</div>
                       <div className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">DR-AES Encryption</div>
                    </div>
                 </div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Global Patient Search Modal */}
      <AnimatePresence>
        {showSearchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Search size={20} />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Global Patient Registry</h2>
                </div>
                <button 
                  onClick={() => setShowSearchModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-8">
                <form onSubmit={handleSearch} className="flex gap-4 mb-8">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      autoFocus
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500 transition-all"
                      placeholder="Search by full name..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="px-8 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all"
                  >
                    {searching ? <Loader2 className="animate-spin" /> : 'Execute Search'}
                  </button>
                </form>

                <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                  {searchResults.length === 0 && searchQuery && !searching ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                      <Database size={32} className="mx-auto mb-4 text-slate-200" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
                    </div>
                  ) : (
                    searchResults.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setShowSearchModal(false);
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-all">
                            <Plus size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{p.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {p.fileNumber}</p>
                          </div>
                        </div>
                        <ChevronRight className="text-slate-300 group-hover:text-purple-600" />
                      </div>
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
