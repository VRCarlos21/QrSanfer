import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// ⚠️ Reemplaza estos valores con los de tu Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA3LTpwxfsd-g9LyF-gsHXw6ktOXCIG7W0",
    authDomain: "qrsystem-6d5e9.firebaseapp.com",
    projectId: "qrsystem-6d5e9",
    storageBucket: "qrsystem-6d5e9.firebasestorage.app",
    messagingSenderId: "489148174691",
    appId: "1:489148174691:web:66a9d3d3f95f187ce50356",
    measurementId: "G-5L3CJRSJVB"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth };