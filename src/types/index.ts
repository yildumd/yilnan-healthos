export type UserRole = 'Records' | 'Accounts' | 'Nurse' | 'Doctor' | 'Lab Technician' | 'Pharmacy' | 'Admin';

export type PatientStatus = 
  | 'waiting_payment' 
  | 'ready_nursing' 
  | 'waiting_doctor' 
  | 'sent_lab' 
  | 'at_pharmacy' 
  | 'completed';

export interface Patient {
  id: string;
  fileNumber: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  nextOfKin: string;
  patientType: string;
  appointmentDate: string;
  status: PatientStatus;
  walletBalance: number;
  createdAt: any;
  updatedAt: any;
}

export interface Vitals {
  id?: string;
  bp: string;
  temp: number;
  pulse: number;
  weight: number;
  observations: string;
  nurseId: string;
  timestamp: any;
}

export interface Consultation {
  id?: string;
  diagnosis: string;
  treatmentPlan: string;
  clinicalNotes: string;
  doctorId: string;
  timestamp: any;
}

export interface Prescription {
  id?: string;
  medications: string[];
  status: 'pending' | 'dispensed';
  doctorId: string;
  timestamp: any;
}

export interface LabRequest {
  id?: string;
  testType: string;
  status: 'pending' | 'completed';
  doctorId: string;
  timestamp: any;
  result?: {
    testType: string;
    result: string;
    referenceRange: string;
    comments: string;
    labTechId: string;
    timestamp: any;
  };
}

export interface Transaction {
  id?: string;
  type: 'deposit' | 'debit';
  amount: number;
  description: string;
  timestamp: any;
  staffId: string;
}

export interface Drug {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastUpdated: any;
}

export interface AuditLog {
  id?: string;
  department: string;
  role: string;
  action: string;
  timestamp: any;
}
