import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, onValue, update, remove, onDisconnect } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBS7LDELHTxq_9fFSJtrMo08See6rwHseo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'movieapp-59d2d.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://movieapp-59d2d-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'movieapp-59d2d',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'movieapp-59d2d.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '495699004893',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:495699004893:web:28012f28454098611b7a34',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, get, push, onValue, update, remove, onDisconnect };
