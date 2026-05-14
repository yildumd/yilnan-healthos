import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED,
  serverTimestamp as fbServerTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// ========== Initialisation ==========
const app = initializeApp(firebaseConfig);

// ========== Firestore with Offline Persistence ==========
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ cacheSizeBytes: CACHE_SIZE_UNLIMITED }),
  databaseId: firebaseConfig.firestoreDatabaseId,
});

// ========== Auth ==========
const auth = getAuth(app);
// Persist login across page reloads
setPersistence(auth, browserLocalPersistence).catch(console.error);

// ========== Emulator Support (development only) ==========
if (import.meta.env.DEV) {
  // Uncomment when running emulators:
  // import { connectFirestoreEmulator, connectAuthEmulator } from 'firebase/auth';
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}

// ========== Helper: Firestore server timestamp ==========
export const serverTimestamp = fbServerTimestamp;

// ========== Exports ==========
export { db, auth };