import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PatientService } from '../lib/patientService';
import { Patient, Prescription, Drug } from '../types';
import { PatientFile } from '../components/PatientFile';
import { 
  Pill, 
  ChevronRight, 
  PackageCheck,
  History,
  AlertCircle,
  Package,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Trash2,
  Edit2,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, updateDoc, doc, serverTimestamp, query, orderBy, onSnapshot, addDoc, deleteDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { seedInventory } from '../lib/seedData';

export const Pharmacy: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [pendingPrescription, setPendingPrescription] = useState<Prescription | null>(null);
  const [activeTab, setActiveTab] = useState<'dispensing' | 'inventory'>('dispensing');
  
  // Inventory state
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drugFormData, setDrugFormData] = useState({
    name: '',
    category: '',
    stock: 0,
    unit: 'Tablets',
    price: 0
  });

  useEffect(() => {
    const unsubQueue = PatientService.subscribeToQueue('at_pharmacy', setPatients);
    
    // Subscribe to inventory
    const q = query(collection(db, 'inventory'), orderBy('name'));
    const unsubInventory = onSnapshot(q, (snapshot) => {
      const dbDrugs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Drug));
      setDrugs(dbDrugs);
      
      // Auto-seed if empty
      if (snapshot.empty) {
        seedInventory();
      }
    });

    return () => {
      unsubQueue();
      unsubInventory();
    };
  }, []);

  useEffect(() => {
    if (selectedPatient) {
       const q = query(collection(db, `patients/${selectedPatient.id}/prescriptions`), orderBy('timestamp', 'desc'));
       return onSnapshot(q, (snapshot) => {
         const prescriptions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Prescription));
         setPendingPrescription(prescriptions.find(p => p.status === 'pending') || null);
       });
    }
  }, [selectedPatient]);

  const handleDispense = async () => {
    if (!selectedPatient || !pendingPrescription) return;

    try {
      setLoading(true);
      // 1. Mark drugs as dispensed
      await updateDoc(doc(db, `patients/${selectedPatient.id}/prescriptions`, pendingPrescription.id!), {
        status: 'dispensed',
        updatedAt: serverTimestamp()
      });

      // 2. Decrement stock from inventory if match found
      for (const med of pendingPrescription.medications) {
        const matchingDrug = drugs.find(d => d.name.toLowerCase().trim() === med.toLowerCase().trim());
        if (matchingDrug) {
          const newStock = Math.max(0, matchingDrug.stock - 1); // For demo, assume 1 unit each
          const status = newStock === 0 ? 'Out of Stock' : newStock < 20 ? 'Low Stock' : 'In Stock';
          await updateDoc(doc(db, 'inventory', matchingDrug.id), {
            stock: newStock,
            status,
            lastUpdated: serverTimestamp()
          });
        }
      }

      // 3. Pharmacy fee deducted from patient wallet
      // For demo, we'll debit a flat fee for drugs
      await PatientService.debitAccount(selectedPatient.id, 2500, 'Pharmacy Medication Fee', 'PHARMACY_STAFF', 'completed');
      
      setSelectedPatient(null);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      alert("Error dispensing drugs: " + (error as any).message);
    }
  };

  const handleAddDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const status = drugFormData.stock === 0 ? 'Out of Stock' : drugFormData.stock < 20 ? 'Low Stock' : 'In Stock';
      await addDoc(collection(db, 'inventory'), {
        ...drugFormData,
        status,
        lastUpdated: serverTimestamp()
      });
      setShowAddDrug(false);
      setDrugFormData({ name: '', category: '', stock: 0, unit: 'Tablets', price: 0 });
    } catch (error) {
      alert("Error adding drug: " + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDrug = async (id: string) => {
    if (!window.confirm("Permanently remove this drug from the registry?")) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (error) {
      alert("Error deleting drug: " + (error as any).message);
    }
  };

  const filteredDrugs = drugs.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Pharmacy <span className="text-emerald-600">Operations</span></h1>
            <p className="text-slate-500 text-sm font-medium">Manage hospital medication inventory and clinical dispensing nodes.</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
             <button 
               onClick={() => setActiveTab('dispensing')}
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dispensing' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                Dispensing Hub
             </button>
             <button 
               onClick={() => setActiveTab('inventory')}
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                Inventory Matrix
             </button>
          </div>
        </div>

        {activeTab === 'dispensing' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-4">
               <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="font-bold text-slate-700 text-[10px] uppercase tracking-widest flex items-center gap-2">
                      <Pill size={14} className="text-emerald-500" />
                      Dispensing Queue
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto scrollbar-hide">
                     {patients.length === 0 ? (
                       <div className="p-16 text-center text-slate-400">
                          <PackageCheck className="opacity-10 mx-auto mb-2" size={32} />
                          <p className="text-[10px] font-bold uppercase tracking-widest">No Prescriptions</p>
                       </div>
                     ) : (
                       patients.map(p => (
                         <div 
                          key={p.id} 
                          onClick={() => setSelectedPatient(p)} 
                          className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer group border-l-4 ${selectedPatient?.id === p.id ? 'bg-slate-50 border-emerald-600' : 'border-transparent'}`}
                         >
                            <div className="flex items-center justify-between">
                               <div className="flex flex-col">
                                 <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors tracking-tight">{p.fullName}</span>
                                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.fileNumber}</span>
                               </div>
                               <ChevronRight size={16} className={`transition-all ${selectedPatient?.id === p.id ? 'text-emerald-600' : 'text-slate-300'}`} />
                            </div>
                         </div>
                       ))
                     )}
                  </div>
               </div>

               <div className="bg-slate-900 rounded-xl p-6 text-white relative overflow-hidden group shadow-xl">
                  <div className="relative z-10">
                     <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-4">Pharmacy Protocol</p>
                     <h3 className="text-lg font-black tracking-tight mb-2">Medication Safety</h3>
                     <p className="text-slate-400 text-xs leading-relaxed font-medium">Verify drug name and dosage against the clinical record before dispensing.</p>
                  </div>
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                     <PackageCheck size={128} />
                  </div>
               </div>
            </div>

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
                      
                      {pendingPrescription ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                           <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                              <h3 className="text-[10px] font-black flex items-center gap-3 uppercase tracking-widest">
                                 <PackageCheck size={18} className="text-emerald-400" />
                                 Active Clinical Prescription
                              </h3>
                              <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-emerald-400 border border-white/10">Authorized</div>
                           </div>
                           <div className="p-8 space-y-8 bg-white overflow-y-auto max-h-[500px] scrollbar-hide">
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Drug Dispensing List</div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {pendingPrescription.medications.map((m, i) => {
                                      const drug = drugs.find(d => d.name.toLowerCase().trim() === m.toLowerCase().trim());
                                      return (
                                        <div key={i} className="bg-white px-4 py-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm group hover:border-emerald-200 transition-colors">
                                          <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-[10px] font-black text-emerald-600 border border-emerald-100">
                                              {i + 1}
                                            </div>
                                            <span className="text-sm font-bold text-slate-800">{m}</span>
                                          </div>
                                          {drug ? (
                                            <div className="flex items-center gap-2">
                                              <div className={`w-2 h-2 rounded-full ${drug.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pool: {drug.stock}</span>
                                            </div>
                                          ) : (
                                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Unmapped Drug</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-3 text-slate-600 mb-6 border-b border-slate-200 pb-2">
                                       <AlertCircle size={14} className="text-blue-500" />
                                       <span className="text-[10px] font-black uppercase tracking-widest">Financial Clearance</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                       <div>
                                          <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Standard Dispensing Fee</div>
                                          <div className="text-xl font-black text-slate-900 tracking-tighter">₦2,500.00</div>
                                       </div>
                                       <div className="h-10 w-px bg-slate-200"></div>
                                       <div className="text-right">
                                          <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Available Liquidity</div>
                                          <div className={`text-xl font-black tracking-tighter ${selectedPatient.walletBalance >= 2500 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            ₦{selectedPatient.walletBalance.toLocaleString()}
                                          </div>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="flex flex-col justify-center gap-4">
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                       <p className="text-[10px] text-blue-600 font-bold italic leading-relaxed">
                                          Dispensed medications are instantly recorded in the patient electronic file for clinical follow-up.
                                       </p>
                                    </div>
                                    <button 
                                      disabled={loading || selectedPatient.walletBalance < 2500}
                                      onClick={handleDispense}
                                      className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl transition-all ${
                                        selectedPatient.walletBalance >= 2500 && !loading
                                        ? 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700 active:scale-95' 
                                        : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none border border-slate-200'
                                      }`}
                                    >
                                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Pill size={18} />}
                                      Confirm Dispense & Debit
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>
                      ) : (
                        <div className="p-8 rounded-xl bg-slate-900 flex items-center gap-6 shadow-2xl border border-white/5">
                           <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                              <History size={32} className="text-blue-400" />
                            </div>
                           <div>
                              <h4 className="text-white font-black text-lg tracking-tight">Prescription Node Inactive</h4>
                              <p className="text-slate-500 text-xs font-medium leading-relaxed uppercase tracking-widest mt-1">Patient is at pharmacy but no authorized electronic prescription is detected.</p>
                           </div>
                        </div>
                      )}
                   </motion.div>
                 ) : (
                   <div className="h-full min-h-[500px] border border-slate-200 rounded-3xl flex flex-col items-center justify-center p-20 text-center bg-slate-50/30 shadow-inner">
                      <div className="w-20 h-20 bg-white rounded-3xl border border-slate-100 flex items-center justify-center mb-8 shadow-xl shadow-slate-200/50">
                        <Pill size={40} className="text-slate-200" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Pharmaceutical Services</h3>
                      <p className="text-slate-500 max-w-sm mt-2 text-sm font-medium leading-relaxed">Authorized e-prescriptions are queued here for fulfillment. Dispensation triggers an automatic wallet transaction and inventory update.</p>
                   </div>
                 )}
               </AnimatePresence>
            </div>
          </div>
        ) : (
          /* Inventory Matrix View */
          <div className="space-y-6">
             <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-blue-400 shadow-lg">
                         <Database size={24} />
                      </div>
                      <div>
                         <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Drug Registry Node</h2>
                         <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Active Inventory • {drugs.length} Categories</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-4">
                      <div className="relative">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                         <input 
                           type="text"
                           placeholder="Filter inventory..."
                           className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none w-full md:w-64"
                           value={searchTerm}
                           onChange={e => setSearchTerm(e.target.value)}
                         />
                      </div>
                      <button 
                        onClick={() => setShowAddDrug(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95"
                      >
                         <Plus size={16} />
                         Add Drug
                      </button>
                   </div>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Medication Identity</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Units</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Price</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Availability</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {filteredDrugs.map(d => (
                            <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                               <td className="p-6">
                                  <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-blue-400 transition-all">
                                        <Pill size={20} />
                                     </div>
                                     <div>
                                        <p className="text-sm font-black text-slate-900 leading-none">{d.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ref: {d.id.slice(0, 8)}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="p-6">
                                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">{d.category}</span>
                               </td>
                               <td className="p-6">
                                  <p className="text-sm font-black text-slate-700">{d.stock} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">{d.unit}</span></p>
                               </td>
                               <td className="p-6">
                                  <p className="text-sm font-black text-emerald-600">₦{d.price.toLocaleString()}</p>
                               </td>
                               <td className="p-6">
                                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                    d.status === 'In Stock' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    d.status === 'Low Stock' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                    'bg-red-50 text-red-600 border border-red-100'
                                  }`}>
                                     <div className={`w-1.5 h-1.5 rounded-full ${
                                       d.status === 'In Stock' ? 'bg-emerald-500' :
                                       d.status === 'Low Stock' ? 'bg-amber-500' :
                                       'bg-red-500'
                                     }`}></div>
                                     {d.status}
                                  </div>
                               </td>
                               <td className="p-6 text-right">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit Drug">
                                        <Edit2 size={16} />
                                     </button>
                                     <button 
                                       onClick={() => handleDeleteDrug(d.id)}
                                       className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Drug"
                                     >
                                        <Trash2 size={16} />
                                     </button>
                                  </div>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>

                {filteredDrugs.length === 0 && (
                   <div className="p-24 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center border border-slate-100 mb-6 shadow-inner">
                         <Package size={32} className="text-slate-200" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching medication records in the registry node</p>
                   </div>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Add Drug Modal */}
      <AnimatePresence>
        {showAddDrug && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-800/10"
            >
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Plus size={20} />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Register New Medication</h2>
                </div>
                <button 
                  onClick={() => setShowAddDrug(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddDrug} className="p-8 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Drug Identity (Name & Strength)</label>
                       <input 
                         required
                         type="text"
                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner"
                         placeholder="e.g. Paracetamol 500mg"
                         value={drugFormData.name}
                         onChange={e => setDrugFormData({...drugFormData, name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Classification</label>
                       <input 
                         required
                         type="text"
                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner"
                         placeholder="e.g. Analgesics"
                         value={drugFormData.category}
                         onChange={e => setDrugFormData({...drugFormData, category: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Stock Units</label>
                       <input 
                         required
                         type="number"
                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner"
                         value={drugFormData.stock}
                         onChange={e => setDrugFormData({...drugFormData, stock: parseInt(e.target.value) || 0})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unit Type</label>
                       <select 
                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner appearance-none cursor-pointer"
                         value={drugFormData.unit}
                         onChange={e => setDrugFormData({...drugFormData, unit: e.target.value})}
                       >
                          <option>Tablets</option>
                          <option>Capsules</option>
                          <option>Vials</option>
                          <option>Puffs</option>
                          <option>Sachets</option>
                          <option>Syrup (Bottles)</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unit Price (₦)</label>
                       <input 
                         required
                         type="number"
                         className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-inner"
                         value={drugFormData.price}
                         onChange={e => setDrugFormData({...drugFormData, price: parseInt(e.target.value) || 0})}
                       />
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-100 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowAddDrug(false)}
                      className="flex-1 py-4 text-[10px] px-6 font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                      disabled={loading}
                      type="submit"
                      className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                       {loading ? "Registering..." : "Activate Medication Node"}
                    </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};
