// Firebase Authentication Service for SUNTIME App
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} displayName - User's display name (optional)
 * @returns {Promise<UserCredential>}
 */
export const signUp = async (email, password, displayName = '') => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Update display name if provided
        if (displayName && userCredential.user) {
            await updateProfile(userCredential.user, { displayName });
        }

        console.log('✅ User signed up:', userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('❌ Sign up error:', error.code, error.message);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
};

/**
 * Sign in an existing user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>}
 */
export const signIn = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ User signed in:', userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('❌ Sign in error:', error.code, error.message);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
};

/**
 * Sign out the current user
 * @returns {Promise<Object>}
 */
export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
        console.log('✅ User signed out');
        return { success: true };
    } catch (error) {
        console.error('❌ Sign out error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get the currently authenticated user
 * @returns {User|null}
 */
export const getCurrentUser = () => {
    return auth.currentUser;
};

/**
 * Listen for authentication state changes
 * This is the key to persistent login - it automatically restores the session
 * @param {function} callback - Function called when auth state changes
 * @returns {function} Unsubscribe function
 */
export const onAuthStateChanged = (callback) => {
    return firebaseOnAuthStateChanged(auth, callback);
};

/**
 * Send password reset email
 * @param {string} email - User's email
 * @returns {Promise<Object>}
 */
export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        console.log('✅ Password reset email sent');
        return { success: true };
    } catch (error) {
        console.error('❌ Password reset error:', error.code);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
};

/**
 * Convert Firebase auth error codes to user-friendly messages
 * @param {string} errorCode - Firebase error code
 * @returns {string}
 */
const getAuthErrorMessage = (errorCode) => {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please sign in.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'Email/password sign-in is not enabled.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
    };

    return errorMessages[errorCode] || 'An error occurred. Please try again.';
};
