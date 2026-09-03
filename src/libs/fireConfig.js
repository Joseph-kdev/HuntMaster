// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence } from "firebase/auth/web-extension";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_KEY,
  authDomain: "huntmaster-31b78.firebaseapp.com",
  projectId: "huntmaster-31b78",
  storageBucket: "huntmaster-31b78.firebasestorage.app",
  messagingSenderId: "116708210021",
  appId: "1:116708210021:web:e6253982fcd71e86811d8c",
  measurementId: "G-GGVMW2LBVP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
});
export const db = getFirestore(app);

export default app;