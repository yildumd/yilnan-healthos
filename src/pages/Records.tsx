import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { PatientService } from "../lib/patientService";
import { Patient } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  UserPlus,
  Search,
  History,
  ChevronRight,
  User,
  Phone,
  MapPin,
  Calendar,
  Droplets,
  Link2,
  Users,
  Wallet,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Records: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [showRegForm, setShowRegForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    dob: "",
    gender: "Male",
    bloodGroup: "O+",
    nextOfKin: "",
    patientType: "Outpatient",
    appointmentDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const unsubRecent =
      PatientService.subscribeToRecentPatients(setRecentPatients);
    const unsubQueue = PatientService.subscribeToQueue(
      "waiting_payment",
      setPatients,
    );

    // Subscribe to all patients for the registry view
    const q = query(collection(db, "patients"), orderBy("fullName"));
    const unsubAll = onSnapshot(q, (snapshot) => {
      setAllPatients(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Patient),
      );
    });

    return () => {
      unsubRecent();
      unsubQueue();
      unsubAll();
    };
  }, []);

  const filteredPatients = allPatients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.fileNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await PatientService.registerPatient(formData, "RECORDS_STAFF");
      setShowRegForm(false);
      setFormData({
        fullName: "",
        phoneNumber: "",
        address: "",
        dob: "",
        gender: "Male",
        bloodGroup: "O+",
        nextOfKin: "",
        patientType: "Outpatient",
        appointmentDate: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      alert("Error registering patient: " + (error as any).message);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Records & Registration
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium">
              Manage patient intake and centralized medical file creation.
            </p>
          </div>
          <button
            onClick={() => setShowRegForm(true)}
            className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus size={18} />
            New Intake
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Centralized Registry */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-blue-400 shadow-lg">
                    <Users size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                      Institutional Patient Registry
                    </h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">
                      Master File Directory • {allPatients.length} Nodes
                    </p>
                  </div>
                </div>
                    <div className="relative w-full md:w-auto">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Filter Registry..."
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/10 outline-none w-full md:w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Patient Node
                      </th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">
                        Clinical File
                      </th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Service Status
                      </th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Wallet Balance
                      </th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right hidden lg:table-cell">
                        Payment Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.map((p) => {
                      const isLowBalance = (p.walletBalance || 0) < 1000;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => navigate(`/patient/${p.id}`)}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-slate-900 group-hover:text-blue-400 transition-all">
                                {p.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-900 leading-none mb-1">
                                  {p.fullName}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">
                                  {p.phoneNumber}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                              </div>
                              <span className="text-[10px] font-black text-slate-600 tracking-widest">
                                {p.fileNumber}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="p-4 text-right">
                            <span
                              className={`text-xs font-black tracking-tight ${isLowBalance ? "text-red-600" : "text-slate-900"}`}
                            >
                              ₦{p.walletBalance?.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-4 text-right hidden lg:table-cell">
                            <div
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                isLowBalance
                                  ? "bg-red-50 text-red-600 border border-red-100"
                                  : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              }`}
                            >
                              {isLowBalance ? (
                                <ShieldAlert size={10} />
                              ) : (
                                <ShieldCheck size={10} />
                              )}
                              {isLowBalance ? "Low" : "OK"}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredPatients.length === 0 && (
                <div className="p-20 text-center">
                  <Search size={40} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    No nodes found matching your query within the registry.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Main Queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                  <h2 className="font-bold text-slate-700 text-[10px] uppercase tracking-widest">
                    Awaiting Verification & Payment
                  </h2>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {patients.length} Files
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {patients.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <History className="opacity-20" size={32} />
                    </div>
                    <p className="text-sm font-medium">
                      Queue is currently clear
                    </p>
                  </div>
                ) : (
                  patients.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors group cursor-pointer border-l-4 border-transparent hover:border-blue-500"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {p.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {p.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">
                            {p.fileNumber} • {p.patientType}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <StatusBadge status={p.status} />
                        <ChevronRight
                          size={16}
                          className="text-slate-300 group-hover:text-slate-900 transition-all transform group-hover:translate-x-1"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Patients */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="font-bold text-slate-700 text-[10px] uppercase tracking-widest">
                  Recently Indexed
                </h2>
                <History size={14} className="text-slate-400" />
              </div>
              <div className="p-2 space-y-1">
                {recentPatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/patient/${p.id}`)}
                    className="p-3 rounded-lg hover:bg-slate-50 flex items-center justify-between group transition-all cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">
                        {p.fullName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium tracking-tight uppercase">
                        {p.fileNumber}
                      </span>
                    </div>
                    <Link2
                      size={12}
                      className="text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 text-white overflow-hidden relative group shadow-xl">
              <div className="relative z-10">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-4">
                  Database Snapshot
                </p>
                <h3 className="font-bold text-xl mb-1">Managed Assets</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                  Centralized files indexed within Yilnan HealthOS.
                </p>
                <div className="text-4xl font-black tracking-tighter">
                  {recentPatients.length + 1540}+{" "}
                  <span className="text-xs text-slate-500 font-bold uppercase">
                    Files
                  </span>
                </div>
              </div>
              <Users className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            </div>
          </div>
        </div>

        {/* Registration Modal */}
        <AnimatePresence>
          {showRegForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-12 bg-slate-900/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-800/10 flex flex-col max-h-[90vh]"
              >
                <div className="bg-slate-900 p-6 md:p-8 text-white relative shrink-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4 shadow-lg shadow-blue-900/40">
                    <UserPlus size={20} className="md:w-6 md:h-6" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">
                    Institutional Case Indexing
                  </h2>
                  <p className="text-slate-400 text-xs md:text-sm mt-1 font-medium">
                    Verify credentials and capture biometric identity for file
                    creation.
                  </p>
                  <button
                    onClick={() => setShowRegForm(false)}
                    className="absolute top-6 md:top-8 right-6 md:right-8 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition-all text-xl"
                  >
                    ×
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-white overflow-y-auto scrollbar-hide"
                >
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block px-1">
                      Legal Full Identity
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Enter legal name..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50 transition-all outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block px-1">
                      Primary Telecoms
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="+234..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50 transition-all outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300"
                      value={formData.phoneNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phoneNumber: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block px-1">
                      Birth Index
                    </label>
                    <input
                      required
                      type="date"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50 transition-all outline-none text-sm font-bold text-slate-900 font-sans"
                      value={formData.dob}
                      onChange={(e) =>
                        setFormData({ ...formData, dob: e.target.value })
                      }
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block px-1">
                      Biological Identity
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 bg-slate-50 transition-all outline-none text-sm font-bold text-slate-900"
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block px-1">
                      Blood Serology
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 bg-slate-50 transition-all outline-none text-sm font-bold text-slate-900"
                      value={formData.bloodGroup}
                      onChange={(e) =>
                        setFormData({ ...formData, bloodGroup: e.target.value })
                      }
                    >
                      <option>O+</option>
                      <option>A+</option>
                      <option>B+</option>
                      <option>AB+</option>
                      <option>O-</option>
                      <option>A-</option>
                      <option>B-</option>
                      <option>AB-</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block px-1">
                      Next of Kin / Beneficiary
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Full Name (Relationship)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50 transition-all outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300"
                      value={formData.nextOfKin}
                      onChange={(e) =>
                        setFormData({ ...formData, nextOfKin: e.target.value })
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2 block px-1">
                      Residential Coordinates
                    </label>
                    <textarea
                      required
                      placeholder="Street, City, State..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50 transition-all outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300"
                      rows={2}
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </div>
                </form>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRegForm(false)}
                    className="flex-1 h-12 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    type="submit"
                    className="flex-[2] h-12 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                  >
                    Authorize File Creation
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};
