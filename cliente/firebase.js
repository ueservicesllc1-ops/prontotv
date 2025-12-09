// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAm9oRmyZIDTm9gnr9hNdDEd-BUwkwN-jM",
  authDomain: "prontotv-f3c3b.firebaseapp.com",
  projectId: "prontotv-f3c3b",
  storageBucket: "prontotv-f3c3b.firebasestorage.app",
  messagingSenderId: "146307419758",
  appId: "1:146307419758:web:89832c7e1ed2677554a07f",
  measurementId: "G-D2Z7Y3KVWZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Analytics (only in browser)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { db, analytics, app };

