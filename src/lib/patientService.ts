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
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { Patient, Transaction, PatientStatus, AuditLog } from '../types';
import { handleFirestoreError, OperationType } from './errorHandler';

export const PatientService = {
  async registerPatient(patientData: Partial<Patient>, staffId: string) {
    const fileNumber = 'FILE-' + Math.floor(100000 + Math.random() * 900000);
    const path = 'patients';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...patientData,
        fileNumber,
        status: 'waiting_payment',
        walletBalance: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      await this.logAction('Records', 'Records', `Registered new patient: ${patientData.fullName} (${fileNumber})`);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateStatus(patientId: string, status: PatientStatus, role: string) {
    const path = `patients/${patientId}`;
    try {
      await updateDoc(doc(db, 'patients', patientId), {
        status,
        updatedAt: serverTimestamp(),
      });
      await this.logAction(role, role, `Changed patient status to: ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async fundWallet(patientId: string, amount: number, staffId: string) {
    const pRef = doc(db, 'patients', patientId);
    const txRef = collection(db, `patients/${patientId}/transactions`);
    
    try {
      await runTransaction(db, async (transaction) => {
        const pDoc = await transaction.get(pRef);
        if (!pDoc.exists()) throw new Error("Patient not found");
        
        transaction.update(pRef, {
          walletBalance: increment(amount),
          updatedAt: serverTimestamp()
        });

        // Use a standard addDoc outside transaction or a helper
        // Transactions in v9 are complex with refs. We'll do it sequentially for now
      });

      await addDoc(txRef, {
        type: 'deposit',
        amount,
        description: 'Wallet deposit',
        timestamp: serverTimestamp(),
        staffId
      });

      await this.logAction('Accounts', 'Accounts', `Funded wallet with ${amount}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `patients/${patientId}`);
    }
  },

  async debitAccount(patientId: string, amount: number, description: string, staffId: string, nextStatus?: PatientStatus) {
    const pRef = doc(db, 'patients', patientId);
    const txRef = collection(db, `patients/${patientId}/transactions`);

    try {
      const pDoc = await getDoc(pRef);
      if (!pDoc.exists()) throw new Error("Patient not found");
      const currentBalance = pDoc.data().walletBalance || 0;
      
      if (currentBalance < amount) {
        throw new Error("Insufficient funds in wallet. Please fund wallet first.");
      }

      await updateDoc(pRef, {
        walletBalance: increment(-amount),
        updatedAt: serverTimestamp(),
        ...(nextStatus ? { status: nextStatus } : {})
      });

      await addDoc(txRef, {
        type: 'debit',
        amount,
        description,
        timestamp: serverTimestamp(),
        staffId
      });

      await this.logAction('Accounts', 'Accounts', `Debited ${amount} for ${description}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `patients/${patientId}`);
    }
  },

  async logAction(department: string, role: string, action: string) {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        department,
        role,
        action,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to log audit", error);
    }
  },

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
