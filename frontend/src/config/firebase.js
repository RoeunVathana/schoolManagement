import { getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDEHJ0Un1pmouYAVv9cghhVAtYxxDjWmuo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'midterm-fe002.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'midterm-fe002',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'midterm-fe002.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '817546520900',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:817546520900:web:6dbed43434b6814e224f11',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-2L9YM4JEJZ',
};

const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
