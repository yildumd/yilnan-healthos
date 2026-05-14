import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { Patient, Vitals, Consultation, Prescription, LabRequest, Transaction, AuditLog } from '../types';
import { StatusBadge } from './StatusBadge';
import { 
  User, 
  Calendar, 
  Droplets, 
  Phone, 
  MapPin, 
  ClipboardList, 
  Stethoscope, 
  Beaker, 
  Pill, 
  Wallet,
  Clock,
  ChevronRight,
  TrendingUp,
  Activity,
  HeartPulse,
  History
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

interface PatientFileProps {
  patientId: string;
}

export const PatientFile: React.FC<PatientFileProps> = ({ patientId }) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<Vitals[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labResults, setLabResults] = useState<LabRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'bio' | 'clinical' | 'history'>('clinical');

  useEffect(() => {
    const unsubPatient = onSnapshot(doc(db, 'patients', patientId), (snapshot) => {
      if (snapshot.exists()) setPatient({ id: snapshot.id, ...snapshot.data() } as Patient);
    });

    const unsubVitals = onSnapshot(query(collection(db, `patients/${patientId}/vitals`), orderBy('timestamp', 'desc')), (snapshot) => {
      setVitals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vitals)));
    });

    const unsubConsults = onSnapshot(query(collection(db, `patients/${patientId}/consultations`), orderBy('timestamp', 'desc')), (snapshot) => {
      setConsultations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consultation)));
    });

    const unsubPresc = onSnapshot(query(collection(db, `patients/${patientId}/prescriptions`), orderBy('timestamp', 'desc')), (snapshot) => {
      setPrescriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)));
    });

    const unsubLab = onSnapshot(query(collection(db, `patients/${patientId}/labResults`), orderBy('timestamp', 'desc')), (snapshot) => {
      setLabResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LabRequest)));
    });

    return () => {
      unsubPatient();
      unsubVitals();
      unsubConsults();
      unsubPresc();
      unsubLab();
    };
  }, [patientId]);

  if (!patient) return null;

  const timelineEvents = [
    ...(patient.createdAt ? [{
      id: 'reg',
      type: 'registration',
      timestamp: patient.createdAt,
      label: 'Patient Admitted / File Created',
      details: 'Records Department',
      icon: User,
      color: 'bg-blue-500'
    }] : []),
    ...vitals.map(v => ({
      id: v.id,
      type: 'vitals',
      timestamp: v.timestamp,
      label: 'Clinical Vitals Captured',
      details: `Nurse ID: ${v.nurseId} • BP: ${v.bp}, Temp: ${v.temp}°C`,
      icon: Activity,
      color: 'bg-indigo-500'
    })),
    ...consultations.map(c => ({
      id: c.id,
      type: 'consultation',
      timestamp: c.timestamp,
      label: 'Physician Consultation',
      details: `Dr. ${c.doctorId} • Diagnosis: ${c.diagnosis}`,
      icon: Stethoscope,
      color: 'bg-emerald-600',
      notes: c.treatmentPlan
    })),
    ...prescriptions.map(p => ({
      id: p.id,
      type: 'prescription',
      timestamp: p.timestamp,
      label: 'Pharmacy Prescription Issued',
      details: `Dr. ${p.doctorId} • ${p.medications.length} items prescribed`,
      icon: Pill,
      color: 'bg-purple-500'
    })),
    ...labResults.flatMap(l => {
      const events: any[] = [{
        id: l.id + '-req',
        type: 'lab-req',
        timestamp: l.timestamp,
        label: `Lab Investigation Requested: ${l.testType}`,
        details: `Dr. ${l.doctorId} • Status: ${l.status}`,
        icon: Beaker,
        color: 'bg-amber-500'
      }];
      if (l.status === 'completed' && l.result) {
        events.push({
          id: l.id + '-res',
          type: 'lab-res',
          timestamp: l.result.timestamp,
          label: `Lab Result Published: ${l.testType}`,
          details: `Lab Tech ID: ${l.result.labTechId} • Result: ${l.result.result}`,
          icon: ClipboardList,
          color: 'bg-emerald-500'
        });
      }
      return events;
    })
  ].filter(e => e.timestamp && e.timestamp.seconds).sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Active Patient Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 mb-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base md:text-lg shrink-0">
            {patient.fullName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 truncate">{patient.fullName}</h2>
              <span className="text-[10px] md:text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium whitespace-nowrap">
                {patient.gender}, {patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A'} yrs
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium tracking-tight truncate">
              ID: <span className="text-slate-900 font-bold">{patient.fileNumber}</span> • {patient.phoneNumber}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-emerald-50 border border-emerald-100 p-2 px-3 md:px-4 rounded-lg flex-1 sm:flex-none leading-tight">
            <p className="text-[9px] md:text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Wallet Balance</p>
            <p className="text-base md:text-lg font-bold text-emerald-700">₦{patient.walletBalance.toLocaleString()}</p>
          </div>
          <button className="px-4 md:px-5 h-10 bg-slate-900 text-white rounded-lg font-bold text-xs md:text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap">
            History
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 px-2 shrink-0 overflow-x-auto scrollbar-hide -mx-2 md:mx-0">
        {[
          { id: 'bio', label: 'Profile', icon: User },
          { id: 'clinical', label: 'Consultation', icon: Stethoscope },
          { id: 'history', label: 'History', icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-3 px-4 md:px-6 text-xs md:text-sm font-bold transition-all relative shrink-0 ${
              activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="file-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Detailed Content */}
      <div className="flex-1 overflow-auto scrollbar-hide">
        {activeTab === 'bio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="lg:col-span-2 space-y-6">
               <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Bio Data & Information</h3>
                 </div>
                 <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Full Name</label>
                      <p className="text-sm font-bold text-slate-900">{patient.fullName}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Date of Birth</label>
                      <p className="text-sm font-bold text-slate-900">{patient.dob}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Gender</label>
                      <p className="text-sm font-bold text-slate-900">{patient.gender}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Blood Group</label>
                      <p className="text-sm font-bold text-red-600">{patient.bloodGroup}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Residential Address</label>
                      <p className="text-sm font-bold text-slate-700 italic flex items-center gap-2">
                        <MapPin size={12} className="text-slate-300" />
                        {patient.address}
                      </p>
                    </div>
                 </div>
               </section>
            </div>
            <div className="lg:col-span-1">
               <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Primary Contact</h3>
                 </div>
                 <div className="p-6 space-y-4">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Next of Kin</label>
                      <p className="text-lg font-bold text-slate-900">{patient.nextOfKin}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Emergency Phone</label>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Phone size={12} className="text-slate-300" />
                        {patient.phoneNumber}
                      </p>
                    </div>
                 </div>
               </section>
            </div>
          </div>
        )}

        {activeTab === 'clinical' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 pb-8">
            <div className="lg:col-span-1 space-y-6">
              {/* Vitals Card */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Clinical Vitals</h3>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {vitals[0] ? format(new Date(vitals[0].timestamp.seconds * 1000), 'HH:mm aaa') : 'N/A'}
                  </span>
                </div>
                {vitals[0] ? (
                  <>
                    <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
                      <div className="p-4">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">BP</p>
                        <p className="text-lg font-bold text-slate-900">{vitals[0].bp} <span className="text-xs text-slate-400 font-medium tracking-tighter">mmHg</span></p>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Temp</p>
                        <p className={`text-lg font-bold ${vitals[0].temp > 37.5 ? 'text-amber-600' : 'text-slate-900'}`}>{vitals[0].temp}°C</p>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Heart Rate</p>
                        <p className="text-lg font-bold text-slate-900">{vitals[0].pulse} <span className="text-xs text-slate-400 font-medium tracking-tighter">BPM</span></p>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Weight</p>
                        <p className="text-lg font-bold text-slate-900">{vitals[0].weight} <span className="text-xs text-slate-400 font-medium tracking-tighter">kg</span></p>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50/50 border-t border-slate-100">
                      <p className="text-[10px] text-blue-500 uppercase font-bold mb-1">Nurse Observations</p>
                      <p className="text-xs text-slate-700 italic leading-relaxed">"{vitals[0].observations}"</p>
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-center text-slate-400 text-xs italic">No vitals captured today</div>
                )}
              </section>

              {/* Lab Request Highlights */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Lab Investigations</h3>
                </div>
                <div className="p-4">
                  {labResults.filter(l => l.status === 'pending').length === 0 ? (
                    <div className="text-center py-6">
                      <Beaker size={24} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 italic">No pending lab work</p>
                    </div>
                  ) : (
                    labResults.filter(l => l.status === 'pending').map(l => (
                      <div key={l.id} className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2 p-2 bg-slate-50 rounded border border-slate-100">
                         <span>{l.testType}</span>
                         <span className="text-[10px] text-amber-600 uppercase">Awaiting Sample</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <section className="bg-white rounded-xl border border-slate-200 shadow-soft flex flex-col h-full min-h-[400px]">
                 <div className="p-6 flex-1 space-y-8">
                    {consultations[0] ? (
                      <div className="space-y-8">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Physician Assessment & Findings</label>
                          <div className="p-5 bg-slate-50 border-slate-200 border rounded-xl text-sm font-bold text-slate-900 shadow-inner">
                            {consultations[0].diagnosis}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Clinical Progress Notes</label>
                          <div className="text-sm text-slate-700 leading-relaxed max-w-none whitespace-pre-wrap">
                            {consultations[0].clinicalNotes}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Treatment & Management Plan</label>
                          <div className="p-5 bg-blue-50/40 border-blue-100 border rounded-xl text-sm text-blue-900 italic font-medium leading-relaxed">
                            {consultations[0].treatmentPlan}
                          </div>
                        </div>

                        {((consultations[0] as any).nurseDirective || (consultations[0] as any).labDirective || (consultations[0] as any).pharmacyDirective || (consultations[0] as any).accountsDirective) && (
                          <div className="pt-6 border-t border-slate-100 mt-8">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-4">Urgent Departmental Directives</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {(consultations[0] as any).nurseDirective && (
                                 <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                   <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">To: Nursing Station</p>
                                   <p className="text-xs font-bold text-amber-900">{(consultations[0] as any).nurseDirective}</p>
                                 </div>
                               )}
                               {(consultations[0] as any).labDirective && (
                                 <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                   <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">To: Laboratory</p>
                                   <p className="text-xs font-bold text-blue-900">{(consultations[0] as any).labDirective}</p>
                                 </div>
                               )}
                               {(consultations[0] as any).pharmacyDirective && (
                                 <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                   <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">To: Pharmacy</p>
                                   <p className="text-xs font-bold text-emerald-900">{(consultations[0] as any).pharmacyDirective}</p>
                                 </div>
                               )}
                               {(consultations[0] as any).accountsDirective && (
                                 <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                                   <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-1">To: Accounts/Billing</p>
                                   <p className="text-xs font-bold text-purple-900">{(consultations[0] as any).accountsDirective}</p>
                                 </div>
                               )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-12">
                         <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-6">
                           <Stethoscope size={32} className="text-slate-300" />
                         </div>
                         <h4 className="text-lg font-bold text-slate-800">Waiting for Consultation</h4>
                         <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">Clinical notes and physician assessments will appear here once the doctor finalizes the entry.</p>
                         <button className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all">
                           Take Consultation
                         </button>
                      </div>
                    )}
                 </div>
                 
                 <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Attending Doc ID: {consultations[0]?.doctorId || 'UNASSIGNED'}</span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button className="flex-1 sm:flex-none px-4 md:px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs md:text-sm font-bold hover:bg-slate-50 transition-all">
                        Archive File
                      </button>
                      <button className="flex-1 sm:flex-none px-4 md:px-6 py-2 bg-slate-900 text-white rounded-lg text-xs md:text-sm font-bold shadow-md hover:bg-slate-800 transition-all">
                        Finalize & Send
                      </button>
                    </div>
                 </div>
               </section>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
             <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Enterprise Case Timeline</h3>
                </div>
                <div className="p-8 space-y-10 relative before:absolute before:left-[39px] before:top-8 before:bottom-8 before:w-px before:bg-slate-100 h-full overflow-y-auto scrollbar-hide">
                   {timelineEvents.map((event, index) => (
                     <motion.div 
                       key={event.id || index}
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: index * 0.05 }}
                       className="flex gap-6 relative"
                     >
                        <div className={`w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 z-10 shrink-0 shadow-sm`}>
                           {format(new Date(event.timestamp.seconds * 1000), 'HH:mm')}
                        </div>
                        <div className="flex gap-3 pt-1 flex-1">
                          <div className={`w-1 ${event.color} rounded-full h-8 shrink-0`}></div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <event.icon size={14} className="text-slate-400" />
                              <p className="text-sm font-bold text-slate-900">{event.label}</p>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                              {event.details} • {format(new Date(event.timestamp.seconds * 1000), 'PP p')}
                            </p>
                            {(event as any).notes && (
                              <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                "{(event as any).notes}"
                              </div>
                            )}
                          </div>
                        </div>
                     </motion.div>
                   ))}

                   {timelineEvents.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-center py-20">
                        <History size={48} className="text-slate-100 mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No History Recorded</p>
                     </div>
                   )}
                </div>
             </section>

             <div className="space-y-6">
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-center p-12">
                   <div className="w-12 h-12 bg-slate-50 rounded-full border border-slate-100 flex items-center justify-center mx-auto mb-4">
                      <History size={20} className="text-slate-300" />
                   </div>
                   <h4 className="text-sm font-bold text-slate-400">Past Visit History</h4>
                   <p className="text-xs text-slate-400 mt-2">No archived visits found for this patient ID.</p>
                </section>
                
                <section className="bg-slate-900 rounded-xl p-6 text-white overflow-hidden relative">
                   <div className="absolute top-0 right-0 p-8 opacity-10">
                      <HeartPulse size={120} />
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Compliance Note</p>
                   <p className="text-xs leading-relaxed text-slate-300">
                      All clinical data is encrypted and stored in accordance with national health informatics standards. Unauthorized access to clinical records is strictly prohibited and logged.
                   </p>
                   <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      Encrypted Connection Active
                   </div>
                </section>
             </div>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">HealthOS 2.0 • Institutional Data Access</span>
      </div>
    </div>
  );
};
