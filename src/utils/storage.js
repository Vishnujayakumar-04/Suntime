import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const KEYS = {
    USER_SETTINGS: 'user_settings',
    SESSION_LOGS: 'session_logs',
    MANUAL_UV: 'manual_uv',
    PROFILE_IMAGE: 'profile_image',
};

/**
 * USER SETTINGS
 */
export const getUserSettings = async () => {
    try {
        const settings = await AsyncStorage.getItem(KEYS.USER_SETTINGS);
        if (settings) {
            return JSON.parse(settings);
        }
        return { skinType: null, isOnboarded: false };
    } catch (error) {
        console.error('Error getting user settings:', error);
        return { skinType: null, isOnboarded: false };
    }
};

export const setOnboarded = async (skinType) => {
    try {
        const currentSettings = await getUserSettings();
        const settings = {
            ...currentSettings,
            skinType,
            isOnboarded: true,
        };
        await AsyncStorage.setItem(KEYS.USER_SETTINGS, JSON.stringify(settings));
    } catch (error) {
        console.error('Error setting onboarded:', error);
    }
};

/**
 * SESSION LOGS
 */
export const getSessionLogs = async () => {
    try {
        const logs = await AsyncStorage.getItem(KEYS.SESSION_LOGS);
        if (logs) {
            return JSON.parse(logs);
        }
        return [];
    } catch (error) {
        console.error('Error getting session logs:', error);
        return [];
    }
};

export const addSessionLog = async (session) => {
    try {
        const logs = await getSessionLogs();
        // Ensure session has an ID
        const sessionWithId = {
            ...session,
            id: session.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
        logs.unshift(sessionWithId);
        // Keep only last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const filteredLogs = logs.filter(log => new Date(log.date) > thirtyDaysAgo);
        await AsyncStorage.setItem(KEYS.SESSION_LOGS, JSON.stringify(filteredLogs));
    } catch (error) {
        console.error('Error adding session log:', error);
    }
};

/**
 * Inject demo data for testing (7 days of fake history)
 */
export const injectDemoData = async () => {
    try {
        const demoLogs = [];
        const today = new Date();

        // Create 7 days of fake session data
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            demoLogs.push({
                id: Date.now() + i * 1000,
                date: date.toISOString(),
                uvIndex: Math.floor(Math.random() * 8) + 2, // Random UV 2-10
                duration: Math.floor(Math.random() * 40) + 10, // Random 10-50 mins
                skinType: 3,
            });
        }

        await AsyncStorage.setItem(KEYS.SESSION_LOGS, JSON.stringify(demoLogs));
        return true;
    } catch (error) {
        console.error('Error injecting demo data:', error);
        return false;
    }
};

/**
 * MANUAL UV
 */
export const getManualUV = async () => {
    try {
        const uv = await AsyncStorage.getItem(KEYS.MANUAL_UV);
        return uv ? parseFloat(uv) : null;
    } catch (error) {
        console.error('Error getting manual UV:', error);
        return null;
    }
};

export const setManualUV = async (uvValue) => {
    try {
        if (uvValue === null || uvValue === '') {
            await AsyncStorage.removeItem(KEYS.MANUAL_UV);
        } else {
            await AsyncStorage.setItem(KEYS.MANUAL_UV, uvValue.toString());
        }
    } catch (error) {
        console.error('Error setting manual UV:', error);
    }
};

/**
 * RESET ALL DATA
 */
export const resetAllData = async () => {
    try {
        await AsyncStorage.multiRemove([
            KEYS.USER_SETTINGS,
            KEYS.SESSION_LOGS,
            KEYS.MANUAL_UV,
            'setup_complete',
            'default_preferences',
            'disclaimer_accepted',
            'active_timer_state'
        ]);
        console.log('✅ All application data reset');
    } catch (error) {
        console.error('Error resetting data:', error);
    }
};

/**
 * PROFILE IMAGE
 */
export const getProfileImage = async () => {
    try {
        const imageUri = await AsyncStorage.getItem(KEYS.PROFILE_IMAGE);
        return imageUri;
    } catch (error) {
        console.error('Error getting profile image:', error);
        return null;
    }
};

export const setProfileImage = async (imageUri) => {
    try {
        if (imageUri) {
            await AsyncStorage.setItem(KEYS.PROFILE_IMAGE, imageUri);
        } else {
            await AsyncStorage.removeItem(KEYS.PROFILE_IMAGE);
        }
    } catch (error) {
        console.error('Error setting profile image:', error);
    }
};

/**
 * ACTIVE TIMER STATE
 * Persists the running timer across restarts
 */
export const getActiveTimer = async () => {
    try {
        const timerData = await AsyncStorage.getItem('active_timer_state');
        return timerData ? JSON.parse(timerData) : null;
    } catch (error) {
        console.error('Error getting active timer:', error);
        return null;
    }
};

export const setActiveTimer = async (endTimestamp, notificationId) => {
    try {
        const timerData = {
            endTimestamp,
            notificationId,
            savedAt: Date.now()
        };
        await AsyncStorage.setItem('active_timer_state', JSON.stringify(timerData));
    } catch (error) {
        console.error('Error setting active timer:', error);
    }
};

export const clearActiveTimer = async () => {
    try {
        await AsyncStorage.removeItem('active_timer_state');
    } catch (error) {
        console.error('Error clearing active timer:', error);
    }
};

// ============================================================================
// SETUP WIZARD
// ============================================================================

/**
 * Check if user has completed setup wizard
 */
export const isSetupComplete = async () => {
    try {
        const setupComplete = await AsyncStorage.getItem('setup_complete');
        return setupComplete === 'true';
    } catch (error) {
        console.error('Error checking setup status:', error);
        return false;
    }
};

/**
 * Mark setup as complete
 */
export const completeSetup = async () => {
    try {
        await AsyncStorage.setItem('setup_complete', 'true');
        return true;
    } catch (error) {
        console.error('Error completing setup:', error);
        return false;
    }
};

/**
 * Save default preferences from setup
 */
export const saveDefaultPreferences = async (preferences) => {
    try {
        const { sunscreen, cloudy } = preferences;
        await AsyncStorage.setItem('default_preferences', JSON.stringify({
            sunscreen: sunscreen !== undefined ? sunscreen : false,
            cloudy: cloudy !== undefined ? cloudy : false,
        }));
        return true;
    } catch (error) {
        console.error('Error saving preferences:', error);
        return false;
    }
};

/**
 * Get default preferences
 */
export const getDefaultPreferences = async () => {
    try {
        const prefs = await AsyncStorage.getItem('default_preferences');
        if (prefs) {
            return JSON.parse(prefs);
        }
        return { sunscreen: false, cloudy: false };
    } catch (error) {
        console.error('Error getting preferences:', error);
        return { sunscreen: false, cloudy: false };
    }
};

/**
 * Save disclaimer acceptance
 */
export const saveDisclaimerAcceptance = async () => {
    try {
        await AsyncStorage.setItem('disclaimer_accepted', 'true');
        return true;
    } catch (error) {
        console.error('Error saving disclaimer:', error);
        return false;
    }
};
