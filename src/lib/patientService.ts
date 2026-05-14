import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  serverTimestamp,
  getDoc,
  increment,
  runTransaction,
  getDocs,
  writeBatch,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Patient, 
  Transaction, 
  PatientStatus, 
  AuditLog,
  Vitals,
  Consultation,
  Prescription,
  LabRequest,
  UserRole
} from '../types';
import { handleFirestoreError, OperationType } from './errorHandler';

export const PatientService = {
  // ========== Core Patient CRUD ==========
  
  async registerPatient(patientData: Omit<Patient, 'id' | 'fileNumber' | 'status' | 'walletBalance' | 'createdAt' | 'updatedAt'>, staffId: string) {
    const fileNumber = 'HOS-' + Math.floor(100000 + Math.random() * 900000);
    const path = 'patients';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...patientData,
        fileNumber,
        status: 'waiting_payment' as PatientStatus,
        walletBalance: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      await this.logAction('Records', 'Records', `Registered new patient: ${patientData.fullName} (${fileNumber})`, docRef.id);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  async getPatientById(patientId: string): Promise<Patient | null> {
    const path = `patients/${patientId}`;
    try {
      const docRef = doc(db, 'patients', patientId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Patient;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async getPatientByFileNumber(fileNumber: string): Promise<Patient | null> {
    const path = 'patients';
    try {
      const q = query(collection(db, path), where('fileNumber', '==', fileNumber), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as Patient;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return null;
    }
  },

  async updatePatientBio(patientId: string, updates: Partial<Patient>) {
    const path = `patients/${patientId}`;
    try {
      const ref = doc(db, 'patients', patientId);
      await updateDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  async updateStatus(patientId: string, status: PatientStatus, role: UserRole) {
    const path = `patients/${patientId}`;
    try {
      await updateDoc(doc(db, 'patients', patientId), {
        status,
        updatedAt: serverTimestamp(),
      });
      await this.logAction(role, role, `Changed patient status to: ${status}`, patientId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  // ========== Wallet Management ==========

  async fundWallet(patientId: string, amount: number, staffId: string) {
    const pRef = doc(db, 'patients', patientId);
    const txRef = collection(db, `patients/${patientId}/transactions`);
    
    try {
      await runTransaction(db, async (transaction) => {
        const pDoc = await transaction.get(pRef);
        if (!pDoc.exists()) throw new Error("Patient not found");
        const newBalance = (pDoc.data().walletBalance || 0) + amount;
        transaction.update(pRef, {
          walletBalance: newBalance,
          updatedAt: serverTimestamp()
        });
        // Add transaction record inside transaction using a reference
        const txDocRef = doc(txRef);
        transaction.set(txDocRef, {
          type: 'deposit',
          amount,
          description: 'Wallet deposit',
          timestamp: serverTimestamp(),
          staffId
        });
      });
      await this.logAction('Accounts', 'Accounts', `Funded wallet with ${amount}`, patientId);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `patients/${patientId}`);
      throw error;
    }
  },

  async debitAccount(patientId: string, amount: number, description: string, staffId: string, nextStatus?: PatientStatus) {
    const pRef = doc(db, 'patients', patientId);
    const txRef = collection(db, `patients/${patientId}/transactions`);

    try {
      await runTransaction(db, async (transaction) => {
        const pDoc = await transaction.get(pRef);
        if (!pDoc.exists()) throw new Error("Patient not found");
        const currentBalance = pDoc.data().walletBalance || 0;
        if (currentBalance < amount) {
          throw new Error(`Insufficient funds. Balance: ${currentBalance}, required: ${amount}`);
        }
        const newBalance = currentBalance - amount;
        const updateData: any = {
          walletBalance: newBalance,
          updatedAt: serverTimestamp()
        };
        if (nextStatus) updateData.status = nextStatus;
        transaction.update(pRef, updateData);
        
        const txDocRef = doc(txRef);
        transaction.set(txDocRef, {
          type: 'debit',
          amount,
          description,
          timestamp: serverTimestamp(),
          staffId
        });
      });
      await this.logAction('Accounts', 'Accounts', `Debited ${amount} for ${description}`, patientId);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `patients/${patientId}`);
      throw error;
    }
  },

  // ========== Subcollection Helpers ==========

  async addVitals(patientId: string, vitals: Omit<Vitals, 'id' | 'timestamp'>) {
    const path = `patients/${patientId}/vitals`;
    try {
      const ref = await addDoc(collection(db, path), {
        ...vitals,
        timestamp: serverTimestamp(),
      });
      await this.logAction('Nurse', 'Nurse', `Vitals recorded: BP ${vitals.bp}, Temp ${vitals.temp}`, patientId);
      return ref.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  async addConsultation(patientId: string, consultation: Omit<Consultation, 'id' | 'timestamp'>) {
    const path = `patients/${patientId}/consultations`;
    try {
      const ref = await addDoc(collection(db, path), {
        ...consultation,
        timestamp: serverTimestamp(),
      });
      await this.logAction('Doctor', 'Doctor', `Consultation: ${consultation.diagnosis}`, patientId);
      return ref.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  async addPrescription(patientId: string, prescription: Omit<Prescription, 'id' | 'timestamp'>) {
    const path = `patients/${patientId}/prescriptions`;
    try {
      const ref = await addDoc(collection(db, path), {
        ...prescription,
        timestamp: serverTimestamp(),
      });
      await this.logAction('Doctor', 'Doctor', `Prescribed: ${prescription.medications.join(', ')}`, patientId);
      return ref.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  async addLabRequest(patientId: string, labRequest: Omit<LabRequest, 'id' | 'timestamp' | 'status'>) {
    const path = `patients/${patientId}/labRequests`;
    try {
      const ref = await addDoc(collection(db, path), {
        ...labRequest,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      await this.logAction('Doctor', 'Doctor', `Lab request: ${labRequest.testType}`, patientId);
      return ref.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  async addLabResult(patientId: string, labRequestId: string, result: LabRequest['result']) {
    const path = `patients/${patientId}/labRequests/${labRequestId}`;
    try {
      await updateDoc(doc(db, path), {
        status: 'completed',
        result: {
          ...result,
          timestamp: serverTimestamp(),
        }
      });
      await this.logAction('Lab Technician', 'Lab Technician', `Lab result for ${result?.testType}: ${result?.result}`, patientId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  async dispensePrescription(patientId: string, prescriptionId: string) {
    const path = `patients/${patientId}/prescriptions/${prescriptionId}`;
    try {
      await updateDoc(doc(db, path), {
        status: 'dispensed',
      });
      await this.logAction('Pharmacy', 'Pharmacy', `Dispensed prescription ${prescriptionId}`, patientId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  },

  async getSubcollection<T>(patientId: string, subcollection: string): Promise<T[]> {
    const path = `patients/${patientId}/${subcollection}`;
    try {
      const q = query(collection(db, path), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // ========== Audit Log ==========

  async logAction(department: string, role: string, action: string, patientId?: string) {
    try {
      const logData: any = {
        department,
        role,
        action,
        timestamp: serverTimestamp(),
      };
      if (patientId) logData.patientId = patientId;
      await addDoc(collection(db, 'auditLogs'), logData);
    } catch (error) {
      console.error("Failed to log audit", error);
      // Non‑critical, don't throw
    }
  },

  async getAuditTrailForPatient(patientId: string): Promise<AuditLog[]> {
    const path = 'auditLogs';
    try {
      const q = query(
        collection(db, path),
        where('patientId', '==', patientId),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AuditLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // ========== Real‑time Subscriptions ==========

  subscribeToQueue(status: PatientStatus, callback: (patients: Patient[]) => void) {
    const q = query(
      collection(db, 'patients'), 
      where('status', '==', status),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, 'patients');
    });
  },

  subscribeToRecentPatients(callback: (patients: Patient[]) => void) {
    const q = query(
      collection(db, 'patients'), 
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    });
  }
};