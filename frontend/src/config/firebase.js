import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAaMd8CgNdjdGaADBxhAWQGUrcjXBQ95Rw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'schoolmanagement-65b53.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'schoolmanagement-65b53',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'schoolmanagement-65b53.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '287064726816',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:287064726816:web:22435632fd0ff98b24b45',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-SMLHNTWVH0',
};

const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
