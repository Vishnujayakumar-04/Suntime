// Firestore Database Service for SUNTIME App
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    serverTimestamp,
    limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Collection names
const COLLECTIONS = {
    USERS: 'users',
    SESSIONS: 'sessions',
};

/**
 * Create or update user profile in Firestore
 * @param {string} userId - Firebase user ID
 * @param {object} profileData - User profile data
 * @returns {Promise<Object>}
 */
export const createUserProfile = async (userId, profileData) => {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await setDoc(userRef, {
            ...profileData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }, { merge: true });

        console.log('✅ User profile created/updated');
        return { success: true };
    } catch (error) {
        console.error('❌ Create profile error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get user profile from Firestore
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Object>}
 */
export const getUserProfile = async (userId) => {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            console.log('✅ User profile retrieved');
            return { success: true, data: docSnap.data() };
        } else {
            console.log('⚠️ No user profile found');
            return { success: true, data: null };
        }
    } catch (error) {
        console.error('❌ Get profile error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update user profile in Firestore
 * @param {string} userId - Firebase user ID
 * @param {object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export const updateUserProfile = async (userId, updates) => {
    try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        // Use setDoc with merge: true instead of updateDoc as per requirements
        await setDoc(userRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        }, { merge: true });

        console.log('✅ User profile updated (merge)');
        return { success: true };
    } catch (error) {
        console.error('❌ Update profile error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Save skin type to user profile
 * @param {string} userId - Firebase user ID
 * @param {number} skinType - Fitzpatrick skin type (1-6)
 * @returns {Promise<Object>}
 */
export const saveSkinType = async (userId, skinType) => {
    return updateUserProfile(userId, { skinType });
};

/**
 * Save user preferences
 * @param {string} userId - Firebase user ID
 * @param {object} preferences - User preferences (sunscreen, cloudy, etc.)
 * @returns {Promise<Object>}
 */
export const savePreferences = async (userId, preferences) => {
    return updateUserProfile(userId, { preferences });
};

/**
 * Mark setup as complete
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Object>}
 */
export const markSetupComplete = async (userId) => {
    return updateUserProfile(userId, { setupComplete: true });
};

/**
 * Save a sun exposure session log
 * @param {string} userId - Firebase user ID
 * @param {object} session - Session data (uvIndex, duration, skinType, date)
 * @returns {Promise<Object>}
 */
export const saveSessionLog = async (userId, session) => {
    try {
        const sessionRef = collection(db, 'sessions', userId, 'logs');
        await addDoc(sessionRef, {
            ...session,
            userId, // Optional: Keep userId in doc for easier querying if needed, though redundant in subcollection
            createdAt: serverTimestamp(),
            // Ensure fields match requirements
            date: session.date || new Date().toISOString(),
            exposureTime: session.exposureTime || 0,
            uvIndex: session.uvIndex || 0,
            skinType: session.skinType || null,
            sunscreen: session.sunscreen || false,
            location: session.location || null,
        });

        console.log('✅ Session log saved to subcollection');
        return { success: true };
    } catch (error) {
        console.error('❌ Save session error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get user's session logs (last 30 days)
 * @param {string} userId - Firebase user ID
 * @param {number} limitCount - Max number of sessions to retrieve
 * @returns {Promise<Object>}
 */
export const getSessionLogs = async (userId, limitCount = 50) => {
    try {
        const sessionsRef = collection(db, 'sessions', userId, 'logs');
        const q = query(
            sessionsRef,
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const sessions = [];

        querySnapshot.forEach((doc) => {
            sessions.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        console.log(`✅ Retrieved ${sessions.length} session logs from subcollection`);
        return { success: true, data: sessions };
    } catch (error) {
        console.error('❌ Get sessions error:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Save active timer state to Firestore for cross-device sync
 * @param {string} userId - Firebase user ID
 * @param {object} timerState - Timer state (endTimestamp, notificationId)
 * @returns {Promise<Object>}
 */
export const saveTimerState = async (userId, timerState) => {
    return updateUserProfile(userId, { activeTimer: timerState });
};

/**
 * Clear active timer state
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Object>}
 */
export const clearTimerState = async (userId) => {
    return updateUserProfile(userId, { activeTimer: null });
};
