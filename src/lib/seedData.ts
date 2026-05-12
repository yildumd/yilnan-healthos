import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { PatientService } from './patientService';

const DEMO_PATIENTS = [
  {
    fullName: 'Adewale Okafor',
    phoneNumber: '+234 812 345 0001',
    address: '14 Unity Street, Ikeja, Lagos',
    dob: '1985-06-12',
    gender: 'Male',
    bloodGroup: 'O+',
    nextOfKin: 'Blessing Okafor (Wife)',
    patientType: 'Outpatient',
    status: 'waiting_doctor',
    walletBalance: 15000,
  },
  {
    fullName: 'Sarah Aminu',
    phoneNumber: '+234 905 555 1122',
    address: 'Flat 4, Garki Court, Abuja',
    dob: '1992-11-03',
    gender: 'Female',
    bloodGroup: 'B-',
    nextOfKin: 'Ibrahim Aminu (Brother)',
    patientType: 'Corporate',
    status: 'at_pharmacy',
    walletBalance: 4200,
  },
  {
    fullName: 'Chinedu Eze',
    phoneNumber: '+234 803 111 2233',
    address: '88 Trans-Amadi, Port Harcourt',
    dob: '1970-01-20',
    gender: 'Male',
    bloodGroup: 'A+',
    nextOfKin: 'Mary Eze (Wife)',
    patientType: 'Outpatient',
    status: 'ready_nursing',
    walletBalance: 25000,
  },
  {
    fullName: 'Zainab Yusuf',
    phoneNumber: '+234 706 999 4455',
    address: 'Kings Road, Kaduna',
    dob: '1998-09-15',
    gender: 'Female',
    bloodGroup: 'O-',
    nextOfKin: 'Ahmed Yusuf (Father)',
    patientType: 'Outpatient',
    status: 'waiting_payment',
    walletBalance: 0,
  },
  {
    fullName: 'Olumide Bakare',
    phoneNumber: '+234 802 333 4444',
    address: '22 Admiralty Way, Lekki',
    dob: '1982-04-12',
    gender: 'Male',
    bloodGroup: 'O+',
    nextOfKin: 'Yetunde Bakare (Wife)',
    patientType: 'Outpatient',
    status: 'completed',
    walletBalance: 500,
  },
  {
    fullName: 'Ijeoma Nwosu',
    phoneNumber: '+234 901 222 3333',
    address: 'Asaba Close, Enugu',
    dob: '1995-12-25',
    gender: 'Female',
    bloodGroup: 'AB+',
    nextOfKin: 'Obinna Nwosu (Husband)',
    patientType: 'Outpatient',
    status: 'at_lab',
    walletBalance: 45000,
  },
  {
    fullName: 'Fatima Mohammed',
    phoneNumber: '+234 809 888 7766',
    address: 'Dala Hill, Kano',
    dob: '2001-07-08',
    gender: 'Female',
    bloodGroup: 'A-',
    nextOfKin: 'Mohammed Sani (Father)',
    patientType: 'Outpatient',
    status: 'waiting_doctor',
    walletBalance: 0,
  }
];

export const seedData = async () => {
  for (const p of DEMO_PATIENTS) {
    const fileNumber = 'FILE-' + Math.floor(100000 + Math.random() * 900000);
    const pRef = await addDoc(collection(db, 'patients'), {
      ...p,
      fileNumber,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Add some history for Sarah
    if (p.fullName === 'Sarah Aminu') {
       await addDoc(collection(db, `patients/${pRef.id}/vitals`), {
          bp: '130/85',
          temp: 37.2,
          pulse: 82,
          weight: 64,
          observations: 'Mild fever and cough for 3 days.',
          nurseId: 'NURSE_02',
          timestamp: serverTimestamp()
       });

       await addDoc(collection(db, `patients/${pRef.id}/consultations`), {
          diagnosis: 'Upper Respiratory Tract Infection',
          treatmentPlan: 'Rest and hydration. Recommended OTC meds.',
          clinicalNotes: 'Lungs clear on auscultation. Throat slightly red.',
          doctorId: 'DR_YILNAN',
          timestamp: serverTimestamp()
       });

       await addDoc(collection(db, `patients/${pRef.id}/prescriptions`), {
          medications: ['Paracetamol 500mg', 'Vitamin C 1000mg', 'Cough Syrup'],
          status: 'pending',
          doctorId: 'DR_YILNAN',
          timestamp: serverTimestamp()
       });
    }

    await PatientService.logAction('System', 'Admin', `Seeded demo patient: ${p.fullName}`);
  }
};

export const INITIAL_DRUGS = [
  {
    name: 'Paracetamol 500mg',
    category: 'Analgesics',
    stock: 5000,
    unit: 'Tablets',
    price: 50,
    status: 'In Stock'
  },
  {
    name: 'Amoxicillin 500mg',
    category: 'Antibiotics',
    stock: 1200,
    unit: 'Capsules',
    price: 150,
    status: 'In Stock'
  },
  {
    name: 'Ciprofloxacin 500mg',
    category: 'Antibiotics',
    stock: 800,
    unit: 'Tablets',
    price: 300,
    status: 'In Stock'
  },
  {
    name: 'Omeprazole 20mg',
    category: 'Antacids',
    stock: 450,
    unit: 'Capsules',
    price: 200,
    status: 'Low Stock'
  },
  {
    name: 'Metformin 500mg',
    category: 'Antidiabetics',
    stock: 2500,
    unit: 'Tablets',
    price: 100,
    status: 'In Stock'
  },
  {
    name: 'Amlodipine 5mg',
    category: 'Antihypertensives',
    stock: 1500,
    unit: 'Tablets',
    price: 80,
    status: 'In Stock'
  },
  {
    name: 'Ventolin Inhaler',
    category: 'Asthma',
    stock: 0,
    unit: 'Puffs',
    price: 3500,
    status: 'Out of Stock'
  }
];

export const seedInventory = async () => {
  for (const drug of INITIAL_DRUGS) {
    await addDoc(collection(db, 'inventory'), {
      ...drug,
      lastUpdated: serverTimestamp()
    });
  }
};
