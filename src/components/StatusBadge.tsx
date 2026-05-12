import React from 'react';
import { PatientStatus } from '../types';

const statusConfig: Record<PatientStatus, { label: string; color: string; bg: string; border: string }> = {
  waiting_payment: { label: 'Waiting for Payment', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
  ready_nursing: { label: 'Ready for Nursing', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
  waiting_doctor: { label: 'Waiting for Doctor', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
  sent_lab: { label: 'Sent to Lab', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  at_pharmacy: { label: 'At Pharmacy', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  completed: { label: 'Completed', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
};

export const StatusBadge: React.FC<{ status: PatientStatus }> = ({ status }) => {
  const config = statusConfig[status] || { label: status, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${config.bg} ${config.color} ${config.border}`}>
      {config.label}
    </span>
  );
};
