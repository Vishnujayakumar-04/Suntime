// Re-enabled for SDK 52+
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
const KEYS = {
    AUTH_USERNAME: 'auth_username',
    AUTH_PASSWORD: 'auth_password',
    AUTH_BIOMETRIC_ENABLED: 'auth_biometric_enabled',
    AUTH_SECURITY_QUESTION: 'auth_security_question',
    AUTH_SECURITY_ANSWER: 'auth_security_answer',
    LOGGED_OUT: 'logged_out', // Simple flag for logout state
};

/**
 * Storage for Expo Go (uses AsyncStorage instead of SecureStore)
 * Note: In production, use SecureStore for better security
 */
const secureStorage = {
    setItem: async (key, value) => {
        return AsyncStorage.setItem(key, value);
    },
    getItem: async (key) => {
        return AsyncStorage.getItem(key);
    },
    deleteItem: async (key) => {
        return AsyncStorage.removeItem(key);
    },
};

/**
 * Hash password using SHA256
 */
export const hashPassword = async (password) => {
    try {
        const hash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            password
        );
        return hash;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error;
    }
};

/**
 * Save user credentials
 */
/**
 * Save user credentials with security question
 */
export const saveCredentials = async (username, password, enableBiometric = false, securityQuestion = '', securityAnswer = '') => {
    try {
        const hashedPassword = await hashPassword(password);

        await secureStorage.setItem(KEYS.AUTH_USERNAME, username);
        await secureStorage.setItem(KEYS.AUTH_PASSWORD, hashedPassword);
        await secureStorage.setItem(KEYS.AUTH_BIOMETRIC_ENABLED, enableBiometric.toString());

        if (securityQuestion && securityAnswer) {
            const hashedAnswer = await hashPassword(securityAnswer.toLowerCase().trim());
            await secureStorage.setItem(KEYS.AUTH_SECURITY_QUESTION, securityQuestion);
            await secureStorage.setItem(KEYS.AUTH_SECURITY_ANSWER, hashedAnswer);
        }

        // Clear logged out flag when registering
        await AsyncStorage.removeItem(KEYS.LOGGED_OUT);

        return true;
    } catch (error) {
        console.error('Error saving credentials:', error);
        throw error;
    }
};

/**
 * Verify password
 */
export const verifyPassword = async (password) => {
    try {
        const storedHash = await secureStorage.getItem(KEYS.AUTH_PASSWORD);
        if (!storedHash) {
            return false;
        }

        const inputHash = await hashPassword(password);
        const isValid = inputHash === storedHash;

        if (isValid) {
            // Clear logged out flag on successful login
            await AsyncStorage.removeItem(KEYS.LOGGED_OUT);
        }

        return isValid;
    } catch (error) {
        console.error('Error verifying password:', error);
        return false;
    }
};

/**
 * Get username
 */
/**
 * Update username
 */
export const updateUsername = async (newUsername) => {
    try {
        await secureStorage.setItem(KEYS.AUTH_USERNAME, newUsername);
        return true;
    } catch (error) {
        console.error('Error updating username:', error);
        return false;
    }
};

/**
 * Get username
 */
export const getUsername = async () => {
    try {
        return await secureStorage.getItem(KEYS.AUTH_USERNAME);
    } catch (error) {
        console.error('Error getting username:', error);
        return null;
    }
};

/**
 * Check if user is registered
 */
export const isUserRegistered = async () => {
    try {
        const username = await secureStorage.getItem(KEYS.AUTH_USERNAME);
        const password = await secureStorage.getItem(KEYS.AUTH_PASSWORD);
        return !!(username && password);
    } catch (error) {
        console.error('Error checking registration:', error);
        return false;
    }
};

/**
 * Check if user is logged OUT
 */
export const isLoggedOut = async () => {
    try {
        const loggedOut = await AsyncStorage.getItem(KEYS.LOGGED_OUT);
        return loggedOut === 'true';
    } catch (error) {
        console.error('Error checking logged out state:', error);
        return false;
    }
};

/**
 * LOGOUT - Clear ALL user data to allow new user registration
 * This removes credentials, settings, and all app data
 */
export const logout = async () => {
    try {
        // Clear all auth credentials
        await secureStorage.deleteItem(KEYS.AUTH_USERNAME);
        await secureStorage.deleteItem(KEYS.AUTH_PASSWORD);
        await secureStorage.deleteItem(KEYS.AUTH_BIOMETRIC_ENABLED);
        await secureStorage.deleteItem(KEYS.AUTH_SECURITY_QUESTION);
        await secureStorage.deleteItem(KEYS.AUTH_SECURITY_ANSWER);
        await AsyncStorage.removeItem(KEYS.LOGGED_OUT);
        
        // Clear all app data (settings, logs, preferences, etc.)
        await AsyncStorage.multiRemove([
            'user_settings',
            'session_logs',
            'manual_uv',
            'profile_image',
            'setup_complete',
            'default_preferences',
            'disclaimer_accepted',
            'user_email',
            'app_lock_enabled'
        ]);
        
        console.log('✅ Logged out - All user data cleared');
        return true;
    } catch (error) {
        console.error('Error logging out:', error);
        return false;
    }
};

/**
 * DELETE ACCOUNT - Remove credentials completely
 */
export const deleteAccount = async () => {
    try {
        await secureStorage.deleteItem(KEYS.AUTH_USERNAME);
        await secureStorage.deleteItem(KEYS.AUTH_PASSWORD);
        await secureStorage.deleteItem(KEYS.AUTH_BIOMETRIC_ENABLED);
        await secureStorage.deleteItem(KEYS.AUTH_SECURITY_QUESTION);
        await secureStorage.deleteItem(KEYS.AUTH_SECURITY_ANSWER);
        await AsyncStorage.removeItem(KEYS.LOGGED_OUT);
        console.log('✅ Account deleted (credentials removed)');
        return true;
    } catch (error) {
        console.error('Error deleting account:', error);
        return false;
    }
};

/**
 * Biometric Authentication - DISABLED for Expo Go compatibility
 */
export const checkBiometricAvailable = async () => {
    try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        return compatible && enrolled;
    } catch (error) {
        console.error('Error checking biometric:', error);
        return false;
    }
};

export const isBiometricEnabled = async () => {
    try {
        const enabled = await secureStorage.getItem(KEYS.AUTH_BIOMETRIC_ENABLED);
        return enabled === 'true';
    } catch (error) {
        console.error('Error checking biometric status:', error);
        return false;
    }
};

export const setBiometricEnabled = async (enabled) => {
    try {
        await secureStorage.setItem(KEYS.AUTH_BIOMETRIC_ENABLED, enabled.toString());
        return true;
    } catch (error) {
        console.error('Error setting biometric status:', error);
        return false;
    }
};

export const authenticateWithBiometric = async () => {
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to access Suntime',
            fallbackLabel: 'Use Password',
        });

        if (result.success) {
            // Clear logged out flag
            await AsyncStorage.removeItem(KEYS.LOGGED_OUT);
        }

        return result.success;
    } catch (error) {
        console.error('Biometric authentication error:', error);
        return false;
    }
};

/**
 * Change password
 */
export const changePassword = async (currentPassword, newPassword) => {
    try {
        const isValid = await verifyPassword(currentPassword);
        if (!isValid) {
            return { success: false, error: 'Current password is incorrect' };
        }

        const hashedPassword = await hashPassword(newPassword);
        await secureStorage.setItem(KEYS.AUTH_PASSWORD, hashedPassword);
        return { success: true };
    } catch (error) {
        console.error('Error changing password:', error);
        return { success: false, error: 'Failed to change password' };
    }
};

/**
 * App Lock Management
 */
export const isAppLockEnabled = async () => {
    try {
        const enabled = await AsyncStorage.getItem('app_lock_enabled');
        return enabled === 'true';
    } catch (error) {
        console.error('Error checking app lock:', error);
        return false;
    }
};

export const setAppLockEnabled = async (enabled) => {
    try {
        if (enabled) {
            await AsyncStorage.setItem('app_lock_enabled', 'true');
        } else {
            await AsyncStorage.removeItem('app_lock_enabled');
        }
    } catch (error) {
        console.error('Error setting app lock:', error);
        console.error('Error setting app lock:', error);
    }
};

/**
 * RECOVERY FUNCTIONS
 */

export const getSecurityQuestion = async () => {
    try {
        return await secureStorage.getItem(KEYS.AUTH_SECURITY_QUESTION);
    } catch (error) {
        console.error('Error getting security question:', error);
        return null;
    }
};

export const verifySecurityAnswer = async (answer) => {
    try {
        const storedHash = await secureStorage.getItem(KEYS.AUTH_SECURITY_ANSWER);
        if (!storedHash) return false;

        const inputHash = await hashPassword(answer.toLowerCase().trim());
        return inputHash === storedHash;
    } catch (error) {
        console.error('Error verification security answer:', error);
        return false;
    }
};

export const resetPassword = async (newPassword) => {
    try {
        const hashedPassword = await hashPassword(newPassword);
        await secureStorage.setItem(KEYS.AUTH_PASSWORD, hashedPassword);
        // Clear logged out flag to allow immediate login if desired, or let them login manually
        return true;
    } catch (error) {
        console.error('Error resetting password:', error);
        return false;
    }
};
