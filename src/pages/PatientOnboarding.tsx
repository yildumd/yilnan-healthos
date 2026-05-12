import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  ArrowLeft, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  User, 
  Calendar,
  Waves
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PatientService } from '../lib/patientService';

export const PatientOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [fileNumber, setFileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    dob: '',
    gender: 'Male',
    address: '',
    bloodGroup: '',
    nextOfKin: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In this system, registerPatient returns the file number logic is inside the service
      // but the service returns the doc id. We want to show the file number to the user.
      const docId = await PatientService.registerPatient(formData, 'SELF_REG');
      if (docId) {
        // We need to fetch the file number which was generated randomly in the service
        // For this demo, let's just assume we show a "pending" message
        setSuccess(true);
      }
    } catch (error) {
      alert("Registration failed: " + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-12 text-center shadow-2xl border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Registration Initialized</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Your clinical profile has been successfully created. Your file is now in the <span className="font-bold text-blue-600">Accounts Queue</span> for verification and wallet activation.
          </p>
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-8 border-dashed">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Instruction</p>
             <p className="text-xs font-bold text-slate-700 italic">Please proceed to the Hospital Accounts Desk to finalize your deposit and activate your patient card.</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-xl"
          >
            Return to Homepage
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back to Hub</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1">
            <div className="sticky top-12">
               <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-200">
                  <UserPlus size={32} className="text-white" />
               </div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Patient <span className="text-blue-600">Onboarding</span></h1>
               <p className="text-slate-500 text-sm leading-relaxed font-medium">Create your digital clinical profile to access Yilnan Health services. Your data is encrypted and synced with our institutional nodes.</p>
               
               <div className="mt-12 space-y-6">
                  <div className="flex gap-4">
                     <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-blue-600">01</span>
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-900">Personal Identity</p>
                        <p className="text-[10px] text-slate-400 font-medium">Demographics and contact info</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-slate-400">02</span>
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-400">Clinical Background</p>
                        <p className="text-[10px] text-slate-400 font-medium">Blood group and allergies</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-slate-400">03</span>
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-400">Wallet Link</p>
                        <p className="text-[10px] text-slate-400 font-medium">Synced with accounts team</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-100 space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Legal Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-4 text-slate-300" size={18} />
                    <input 
                      required
                      type="text"
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all shadow-inner"
                      placeholder="e.g. John Doe"
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-4 text-slate-300" size={18} />
                    <input 
                      required
                      type="tel"
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all shadow-inner"
                      placeholder="+234 ..."
                      value={formData.phoneNumber}
                      onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-4 text-slate-300" size={18} />
                    <input 
                      required
                      type="date"
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all shadow-inner"
                      value={formData.dob}
                      onChange={e => setFormData({...formData, dob: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gender Identification</label>
                  <select 
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all shadow-inner appearance-none cursor-pointer"
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Residential Residence</label>
                   <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-slate-300" size={18} />
                    <textarea 
                      required
                      rows={2}
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all shadow-inner"
                      placeholder="Home address..."
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Blood Group (Optional)</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all shadow-inner"
                    placeholder="e.g. O+"
                    value={formData.bloodGroup}
                    onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Next of Kin Contact</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all shadow-inner"
                    placeholder="Name and Phone Number"
                    value={formData.nextOfKin}
                    onChange={e => setFormData({...formData, nextOfKin: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-6">
                 <button 
                  disabled={loading}
                  type="submit"
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                    {loading ? (
                      <Waves className="animate-spin" size={18} />
                    ) : (
                      <>
                        <UserPlus size={18} />
                        Initialize Clinical Node
                      </>
                    )}
                 </button>
                 <p className="text-center text-[10px] text-slate-400 font-bold mt-6 uppercase tracking-widest">Digital signature required upon arrival at hospital</p>
              </div>
            </motion.form>
          </div>
        </div>
      </div>
    </div>
  );
};
