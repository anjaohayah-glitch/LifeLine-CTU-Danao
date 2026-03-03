import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDNxctzLhSWLW6eE0mg3ik4630N70CzGuM",
  authDomain: "lifelineexpo.firebaseapp.com",
  databaseURL: "https://lifelineexpo-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lifelineexpo",
  storageBucket: "lifelineexpo.firebasestorage.app",
  messagingSenderId: "135047181240",
  appId: "1:135047181240:web:1f00ff9c1eedd9ff1c954d",
  measurementId: "G-K08S6FKR3K"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };
