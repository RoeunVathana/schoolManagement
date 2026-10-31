import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const hostedAuthDomain = ['campusflowlms.xyz', 'www.campusflowlms.xyz'].includes(window.location.hostname)
  ? window.location.hostname
  : (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'shoolmanagement-65b53.firebaseapp.com');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAaMd8CgNdjdGaADBxhAWQGUrcjXBQ95Rw',
  authDomain: hostedAuthDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'shoolmanagement-65b53',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'shoolmanagement-65b53.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '287064726816',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:287064726816:web:224356362fd0ff98b24b45',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-SMLHNTWVH0',
};

const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
