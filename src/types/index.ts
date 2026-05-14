// ========== Core Roles ==========
export type UserRole = 'Records' | 'Accounts' | 'Nurse' | 'Doctor' | 'Lab Technician' | 'Pharmacy' | 'Admin';
// Alias for backward compatibility with components expecting 'Role'
export type Role = UserRole;

// ========== Patient Status ==========
export type PatientStatus = 
  | 'waiting_payment' 
  | 'ready_nursing' 
  | 'waiting_doctor' 
  | 'sent_lab' 
  | 'at_pharmacy' 
  | 'completed';

// ========== Patient ==========
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
  createdAt: any;   // Firestore Timestamp
  updatedAt: any;
  // Optional fields (used in UI forms, safe to add)
  email?: string;
  emergencyContactPhone?: string;
  allergies?: string[];  // or string (comma separated)
}

// ========== Vitals ==========
export interface Vitals {
  id?: string;
  bp: string;           // blood pressure, e.g., "120/80"
  temp: number;         // celsius
  pulse: number;        // bpm
  weight: number;       // kg
  observations: string;
  nurseId: string;
  timestamp: any;
}

// ========== Consultation (Doctor's note) ==========
export interface Consultation {
  id?: string;
  diagnosis: string;
  treatmentPlan: string;
  clinicalNotes: string;
  doctorId: string;
  timestamp: any;
}

// ========== Prescription ==========
export interface Prescription {
  id?: string;
  medications: string[];   // e.g., ["Amoxicillin 500mg - 1x/day for 7 days"]
  status: 'pending' | 'dispensed';
  doctorId: string;
  timestamp: any;
}

// ========== Lab Request & Result ==========
export interface LabRequest {
  id?: string;
  patientId?: string;      // to link back to patient (useful for queries)
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

// ========== Financial Transaction ==========
export type TransactionType = 'deposit' | 'debit';
export interface Transaction {
  id?: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: any;
  staffId: string;
}

// ========== Drug Inventory ==========
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

// ========== Audit Log (enhanced) ==========
export interface AuditLog {
  id?: string;
  patientId: string;      // required to associate with patient timeline
  staffId: string;        // who performed action
  department: string;     // e.g., 'Records', 'Nurse'
  role: string;           // UserRole
  action: string;
  timestamp: any;
}