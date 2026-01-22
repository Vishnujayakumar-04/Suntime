// Firebase Configuration for SUNTIME App
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC_hdl4GApTkbXLY7NP-Jth3bBHss1nIBc",
    authDomain: "suntime-03.firebaseapp.com",
    projectId: "suntime-03",
    storageBucket: "suntime-03.firebasestorage.app",
    messagingSenderId: "486387728301",
    appId: "1:486387728301:web:0e97989213cc2fa47a6b24",
    measurementId: "G-SZBYLMDLZP"
};

// Initialize Firebase
let app;
let auth;
let db;
let storage;

try {
    app = initializeApp(firebaseConfig);

    // Initialize Auth with AsyncStorage persistence for React Native
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });

    // Initialize Firestore
    db = getFirestore(app);

    // Initialize Storage
    try {
        storage = getStorage(app);
    } catch (e) {
        console.warn('Storage initialization failed (likely already initialized):', e);
        storage = getStorage(app); // Retry or existing
    }

} catch (error) {
    console.error('Firebase initialization error:', error);
}

export { app, auth, db, storage };
