/**
 * Firestore Service for SUNTIME
 * 
 * Handles user data and session storage in Firebase Firestore.
 * Supports multi-device login (Firebase Auth default behavior).
 * 
 * IMPORTANT: This is the PRIMARY Firestore service.
 * All user/session operations should go through this file.
 * 
 * Collections:
 * - users/{uid}: User profile data
 * - sessions/{id}: Sun exposure session logs
 * 
 * User Document Schema:
 * {
 *   uid: string,
 *   username: string,
 *   email: string,
 *   skinType: number (1-6),
 *   preferences: { sunscreen: boolean, cloudy: boolean, uvPreference: string },
 *   setupCompleted: boolean,
 *   profileImage: string (Firebase Storage URL),
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

import {
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    limit,
    serverTimestamp
} from 'firebase/firestore';
import { calculateSafeTime, getUVCategory, calculateExposureScore } from '../utils/sunLogic';

// Collection names
const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';

// ==========================================
// USER DATA FUNCTIONS
// ==========================================

/**
 * Save or update user data in Firestore
 * Uses merge: true to only update provided fields
 * NEVER creates duplicate documents - always uses user.uid as document ID
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} userData - User data to save
 * @returns {boolean} Success status
 */
export const saveUserToFirestore = async (uid, userData) => {
    try {
        if (!uid) {
            console.error('saveUserToFirestore: No UID provided');
            return false;
        }

        const userRef = doc(db, USERS_COLLECTION, uid);
        const existingDoc = await getDoc(userRef);

        const dataToSave = {
            ...userData,
            uid: uid,
            updatedAt: new Date().toISOString()
        };

        // Only set createdAt on first save
        if (!existingDoc.exists()) {
            dataToSave.createdAt = new Date().toISOString();
        }

        await setDoc(userRef, dataToSave, { merge: true });
        return true;
    } catch (error) {
        console.error('Error saving user to Firestore:', error);
        return false;
    }
};

/**
 * Create initial user profile (called on sign up)
 * Sets default values for new users
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} profileData - Initial profile data
 * @returns {object} Result with success status
 */
export const createUserProfile = async (uid, profileData) => {
    try {
        if (!uid) {
            return { success: false, error: 'No UID provided' };
        }

        const userRef = doc(db, USERS_COLLECTION, uid);
        const existingDoc = await getDoc(userRef);

        // Don't overwrite existing profile
        if (existingDoc.exists()) {
            return { success: true, message: 'Profile already exists' };
        }

        const initialData = {
            uid: uid,
            username: profileData.displayName || profileData.email?.split('@')[0] || 'User',
            email: profileData.email || '',
            skinType: profileData.skinType || null,
            preferences: {
                sunscreen: false,
                cloudy: false,
                uvPreference: 'gps'
            },
            setupCompleted: false,
            profileImageUrl: null,
            profileImage: null, // Legacy
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await setDoc(userRef, initialData);
        return { success: true };
    } catch (error) {
        console.error('Error creating user profile:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Fetch user data from Firestore
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object|null} User data or null
 */
export const fetchUserData = async (uid) => {
    try {
        if (!uid) return null;
        console.log(`[DEBUG] Fetching user profile for UID: ${uid}`);
        const userRef = doc(db, USERS_COLLECTION, uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            console.log(`[DEBUG] Profile found for UID: ${uid}`);
            return { id: docSnap.id, ...docSnap.data() };
        }
        console.log(`[DEBUG] No profile found for UID: ${uid}`);
        return null;
    } catch (error) {
        console.error('Error fetching user from Firestore:', error);
        return null;
    }
};

/**
 * Validate and auto-fix user profile data
 * Ensures all required fields exist.
 */
const validateAndFixProfile = async (uid, data) => {
    let needsUpdate = false;
    const updates = {};

    // 1. Check Setup Status & Defaults
    if (data.setupCompleted === undefined) {
        updates.setupCompleted = false;
        needsUpdate = true;
    }

    // 2. Check Preferences
    if (!data.preferences) {
        updates.preferences = {
            sunscreen: false,
            cloudy: false,
            uvPreference: 'gps'
        };
        needsUpdate = true;
    }

    // 3. Check Image URL Standard
    if (data.profileImageUrl === undefined) {
        // Migration: If profileImage exists but profileImageUrl doesn't, copy it
        updates.profileImageUrl = data.profileImage || null;
        needsUpdate = true;
    }

    // 4. Check Vitamin D
    if (data.vitaminDLevel === undefined) {
        updates.vitaminDLevel = null;
        needsUpdate = true;
    }

    // 5. Check Skin Type
    if (data.skinType === undefined) {
        updates.skinType = null;
        needsUpdate = true;
    }

    if (needsUpdate) {
        console.log(`[DEBUG] Auto-fixing profile for ${uid}:`, updates);
        await saveUserToFirestore(uid, updates);
        return { ...data, ...updates };
    }
    return data;
};

/**
 * Get user profile (compatible with firebaseFirestore.js API)
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object} Result with success and data
 */
export const getUserProfile = async (uid) => {
    try {
        const data = await fetchUserData(uid);
        if (data) {
            // Validate and Fix
            const validatedData = await validateAndFixProfile(uid, data);
            return { success: true, data: validatedData };
        }
        return { success: true, data: null };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Update user profile fields
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} updates - Fields to update
 * @returns {object} Result with success status
 */
export const updateUserProfile = async (uid, updates) => {
    try {
        const success = await saveUserToFirestore(uid, updates);
        return { success };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Update user's profile picture URL in Firestore
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {string} profileImageUrl - Firebase Storage download URL
 * @returns {boolean} Success status
 */
export const updateUserProfilePic = async (uid, profileImageUrl) => {
    try {
        if (!uid || !profileImageUrl) return false;

        const userRef = doc(db, USERS_COLLECTION, uid);

        // Update using explicit field name requested
        console.log(`[DEBUG] Updating Firestore profile pic for ${uid} with URL: ${profileImageUrl}`);

        await setDoc(userRef, {
            profileImageUrl: profileImageUrl, // Explicitly match requirements
            profileImage: profileImageUrl,    // Keep backward compatibility just in case
            updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log('[DEBUG] Firestore profile pic updated successfully');
        return true;
    } catch (error) {
        console.error('Error updating profile pic:', error);
        return false;
    }
};

/**
 * Mark setup as completed
 * Called after final setup step (Step 4 Disclaimer)
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object} Result with success status
 */
export const markSetupCompleted = async (uid) => {
    try {
        if (!uid) return { success: false };

        const userRef = doc(db, USERS_COLLECTION, uid);
        await setDoc(userRef, {
            setupCompleted: true,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('Error marking setup complete:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Reset setup (for testing or user request)
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object} Result with success status
 */
export const resetSetup = async (uid) => {
    try {
        if (!uid) return { success: false };

        const userRef = doc(db, USERS_COLLECTION, uid);
        await setDoc(userRef, {
            setupCompleted: false,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('Error resetting setup:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Reset User Profile Data (For Reset Account feature)
 * Clears skin type, preferences, location, and setup status.
 * Keeps: username, email, account creation date.
 * 
 * @param {string} uid 
 */
export const resetUserProfile = async (uid) => {
    try {
        if (!uid) return { success: false };
        const userRef = doc(db, USERS_COLLECTION, uid);

        await setDoc(userRef, {
            skinType: null,
            vitaminDLevel: null, // Reset health data
            preferences: {
                sunscreen: false,
                cloudy: false,
                uvPreference: 'gps'
            },
            setupCompleted: false,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('Error resetting user profile:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Save user preferences
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} preferences - User preferences
 * @returns {object} Result with success status
 */
export const savePreferences = async (uid, preferences) => {
    return updateUserProfile(uid, { preferences });
};

/**
 * Save skin type
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {number} skinType - Fitzpatrick skin type (1-6)
 * @returns {object} Result with success status
 */
export const saveSkinType = async (uid, skinType) => {
    return updateUserProfile(uid, { skinType });
};

// ==========================================
// SESSION DATA FUNCTIONS
// ==========================================

/**
 * Save a sun exposure session to Firestore
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} sessionData - Session data
 * @returns {boolean} Success status
 */
export const saveSessionToFirestore = async (uid, sessionData) => {
    try {
        if (!uid) {
            console.error('saveSessionToFirestore: No UID provided');
            return false;
        }

        const sessionsRef = collection(db, SESSIONS_COLLECTION);
        console.log(`[DEBUG] Saving new session for UID: ${uid}`);

        // Calculate Normalized Score
        // We need to estimate isCloudy/hasSunscreen if not passed explicitly.
        // For now, we will default to false if not in sessionData, or rely on what's passed.
        // HomeScreen passes: { uvIndex, duration, skinType, date }
        // It DOES NOT pass isCloudy or hasSunscreen currently in handleTimerComplete!
        // I should update HomeScreen to pass those first? 
        // Or I can calculate it here if I trust the user inputs.
        // The user request says "Store: rawExposure, exposureScore...".
        // Let's assume sessionData MIGHT have these if I update HomeScreen, 
        // but if not, we do our best or default.
        // Wait, I should update HomeScreen to pass them. 
        // BUT, I can implement the saving logic here now.

        const isCloudy = sessionData.isCloudy || false;
        const hasSunscreen = sessionData.hasSunscreen || false;
        const duration = sessionData.duration || sessionData.exposureTime || 0;

        const scoreData = calculateExposureScore(
            sessionData.uvIndex || 0,
            duration,
            sessionData.skinType || 3,
            isCloudy,
            hasSunscreen
        );

        await addDoc(sessionsRef, {
            userId: uid,
            date: sessionData.date || new Date().toISOString(),
            duration: duration,
            uvIndex: sessionData.uvIndex || 0,
            skinType: sessionData.skinType || 3,
            isCloudy,
            hasSunscreen,

            // New Normalized Data
            rawExposure: scoreData.rawExposure,
            exposureScore: scoreData.score,
            exposureStatus: scoreData.status,
            recommendation: scoreData.recommendation,

            createdAt: new Date().toISOString()
        });

        return true;
    } catch (error) {
        console.error('Error saving session to Firestore:', error);
        return false;
    }
};

/**
 * Fetch user's sessions from Firestore
 * Ordered by date descending (most recent first)
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {array} Array of session objects
 */
export const fetchSessions = async (uid) => {
    try {
        if (!uid) return [];
        const sessionsRef = collection(db, SESSIONS_COLLECTION);

        // Primary query with ordering (requires composite index)
        const q = query(
            sessionsRef,
            where('userId', '==', uid),
            orderBy('date', 'desc'),
            limit(100)
        );

        console.log(`[DEBUG] Querying sessions for UID: ${uid}`);

        const querySnapshot = await getDocs(q);
        const sessions = [];
        querySnapshot.forEach((doc) => {
            sessions.push({ id: doc.id, ...doc.data() });
        });

        console.log(`[DEBUG] Found ${sessions.length} sessions for UID: ${uid}`);
        return sessions;
    } catch (error) {
        // Fallback for missing index
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            console.warn('⚠️ Firestore index missing. Using fallback query.');
            try {
                const sessionsRef = collection(db, SESSIONS_COLLECTION);
                const fallbackQ = query(
                    sessionsRef,
                    where('userId', '==', uid),
                    limit(100)
                );
                const fallbackSnapshot = await getDocs(fallbackQ);
                const sessions = [];
                fallbackSnapshot.forEach((doc) => {
                    sessions.push({ id: doc.id, ...doc.data() });
                });
                // Sort client-side
                sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
                return sessions;
            } catch (fallbackError) {
                console.error('Firestore fallback query failed:', fallbackError);
                return [];
            }
        }
        console.error('Error fetching sessions:', error);
        return [];
    }
};

/**
 * Get session statistics for a user
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object} Stats object with totalSessions, totalMinutes, streak, averagePerDay
 */
export const getSessionStats = async (uid) => {
    try {
        const sessions = await fetchSessions(uid);

        if (!sessions || sessions.length === 0) {
            return {
                totalSessions: 0,
                totalMinutes: 0,
                currentStreak: 0,
                averagePerDay: 0
            };
        }

        const totalSessions = sessions.length;
        const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || s.exposureTime || 0), 0);

        // Calculate streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let streak = 0;
        let checkDate = new Date(today);

        for (let i = 0; i < 30; i++) {
            const hasSession = sessions.some(s => {
                const sessionDate = new Date(s.date);
                sessionDate.setHours(0, 0, 0, 0);
                return sessionDate.getTime() === checkDate.getTime();
            });

            if (hasSession) {
                streak++;
            } else if (i > 0) {
                break;
            }
            checkDate.setDate(checkDate.getDate() - 1);
        }

        // Calculate average per day
        const uniqueDays = new Set();
        sessions.forEach(s => {
            const d = new Date(s.date);
            uniqueDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        });
        const averagePerDay = uniqueDays.size > 0 ? Math.round(totalMinutes / uniqueDays.size) : 0;

        return {
            totalSessions,
            totalMinutes,
            currentStreak: streak,
            averagePerDay
        };
    } catch (error) {
        console.error('Error calculating session stats:', error);
        return {
            totalSessions: 0,
            totalMinutes: 0,
            currentStreak: 0,
            averagePerDay: 0
        };
    }
};

// Legacy compatibility - markSetupComplete (old name)
export const markSetupComplete = markSetupCompleted;

// Helper to get local YYYY-MM-DD
const getLocalTodayDate = () => {
    const now = new Date();
    // Use en-CA for YYYY-MM-DD format consistently across locales
    return now.toLocaleDateString('en-CA');
};

/**
 * Check if the user has already completed a session today.
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object} { allowed: boolean, message: string }
 */
export const checkDailySessionLimit = async (uid) => {
    try {
        if (!uid) return { allowed: true };

        const userRef = doc(db, USERS_COLLECTION, uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const lastDate = data.lastSessionDate || null;
            const completed = data.sessionCompleted || false;

            // Get today's local date
            const today = getLocalTodayDate();

            if (lastDate === today && completed) {
                return {
                    allowed: false,
                    message: "Your sun exposure session for today is finished. Please come back tomorrow."
                };
            }
        }
        return { allowed: true };
    } catch (error) {
        console.error('Error checking daily limit:', error);
        // Fallback to allowed in case of network error to avoid blocking user
        return { allowed: true };
    }
};

/**
 * Mark daily session as completed.
 * Should be called when the timer finishes.
 * 
 * @param {string} uid - Firebase Auth UID
 */
export const updateDailySession = async (uid) => {
    try {
        if (!uid) return;

        const userRef = doc(db, USERS_COLLECTION, uid);
        const today = getLocalTodayDate();

        await setDoc(userRef, {
            lastSessionDate: today,
            sessionCompleted: true,
            updatedAt: new Date().toISOString()
        }, { merge: true });

    } catch (error) {
        console.error('Error updating daily session:', error);
    }
};
