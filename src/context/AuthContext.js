// Authentication Context for SUNTIME App
// Provides global auth state and Firebase integration
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signIn, signUp, signOut } from '../services/firebaseAuth';
import { createUserProfile, getUserProfile } from '../services/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(true);

    // Listen for Firebase auth state changes
    // This automatically restores the session on app launch
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(async (firebaseUser) => {

            if (firebaseUser) {
                setUser(firebaseUser);

                // Fetch user profile from Firestore
                try {
                    const profileResult = await getUserProfile(firebaseUser.uid);
                    if (profileResult.success && profileResult.data) {
                        setUserProfile(profileResult.data);
                    } else {
                        // No profile exists yet - will be created during signup
                        setUserProfile(null);
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    setUserProfile(null);
                }
            } else {
                setUser(null);
                setUserProfile(null);
            }

            setInitializing(false);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    /**
     * Handle user sign up
     * @param {string} email 
     * @param {string} password 
     * @param {string} displayName 
     * @returns {Promise<Object>}
     */
    const handleSignUp = async (email, password, displayName = '') => {
        setLoading(true);
        try {
            const result = await signUp(email, password, displayName);

            if (result.success && result.user) {
                // Create initial user profile in Firestore
                // Uses doc(db, "users", user.uid) - never creates duplicates
                await createUserProfile(result.user.uid, {
                    email: result.user.email,
                    displayName: displayName || email.split('@')[0],
                    skinType: null,
                    setupCompleted: false, // IMPORTANT: Use setupCompleted, not setupComplete
                    preferences: {
                        sunscreen: false,
                        cloudy: false,
                        uvPreference: 'gps'
                    },
                    profileImage: null,
                });

                // Fetch the newly created profile
                const profileResult = await getUserProfile(result.user.uid);
                if (profileResult.success && profileResult.data) {
                    setUserProfile(profileResult.data);
                }
            }

            setLoading(false);
            return result;
        } catch (error) {
            setLoading(false);
            return { success: false, error: error.message };
        }
    };

    /**
     * Handle user sign in
     * Fetches existing profile from Firestore - does NOT create new document
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>}
     */
    const handleSignIn = async (email, password) => {
        setLoading(true);
        try {
            const result = await signIn(email, password);

            if (result.success && result.user) {
                // Fetch existing profile - don't create new one
                const profileResult = await getUserProfile(result.user.uid);
                if (profileResult.success && profileResult.data) {
                    setUserProfile(profileResult.data);
                }
            }

            setLoading(false);
            return result;
        } catch (error) {
            setLoading(false);
            return { success: false, error: error.message };
        }
    };

    /**
     * Handle user sign out
     * @returns {Promise<Object>}
     */
    const handleSignOut = async () => {
        setLoading(true);
        try {
            // Clear ALL local storage data to ensure clean logout
            await AsyncStorage.multiRemove([
                'active_timer_state',
                'setup_complete',
                'default_preferences',
                'user_settings',
                'disclaimer_accepted',
                'session_logs',
                'manual_uv',
                'profile_image',
                'app_theme',
            ]);

            const result = await signOut();
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            return result;
        } catch (error) {
            setLoading(false);
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    };

    /**
     * Refresh user profile from Firestore
     * Call this after updating profile data
     */
    const refreshProfile = async () => {
        if (user) {
            const profileResult = await getUserProfile(user.uid);
            if (profileResult.success && profileResult.data) {
                setUserProfile(profileResult.data);
            }
        }
    };

    const value = {
        user,
        userProfile,
        loading,
        initializing,
        isAuthenticated: !!user,
        // Check if setup is completed from Firestore profile
        isSetupComplete: userProfile?.setupCompleted === true,
        signUp: handleSignUp,
        signIn: handleSignIn,
        signOut: handleSignOut,
        refreshProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
