import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    ScrollView,
    Alert,
    Platform
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import {
    getUserSettings,
    getManualUV,
    setManualUV,
    resetAllData,
    injectDemoData,
} from '../utils/storage';

import {
    isAppLockEnabled,
    setAppLockEnabled,
    isUserRegistered,
    checkBiometricAvailable,
    logout,
    deleteAccount as deleteAccountAuth,
} from '../utils/auth';

export default function SettingsScreen({ navigation }) {
    const [manualUV, setManualUVState] = useState('');
    const [appLockEnabled, setAppLockEnabledState] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const uv = await getManualUV();
            if (uv !== null) {
                setManualUVState(uv.toString());
            }

            // Load App Lock settings
            const lockEnabled = await isAppLockEnabled();
            setAppLockEnabledState(lockEnabled);

            const registered = await isUserRegistered();
            setIsRegistered(registered);

            const bioAvailable = await checkBiometricAvailable();
            setBiometricAvailable(bioAvailable);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleSetManualUV = async () => {
        const uvValue = parseFloat(manualUV);

        if (isNaN(uvValue) || uvValue < 0 || uvValue > 15) {
            Alert.alert('Invalid UV Index', 'Please enter a value between 0-15.');
            return;
        }

        try {
            await setManualUV(uvValue);
            console.log('✅ Manual UV saved:', uvValue);
            Alert.alert('Success', `Manual UV set to ${uvValue.toFixed(1)}.`);

            // Navigate to Home to refresh data
            setTimeout(() => {
                navigation.navigate('Home');
            }, 500);
        } catch (error) {
            console.error('Error setting manual UV:', error);
            Alert.alert('Error', 'Failed to set manual UV: ' + error.message);
        }
    };

    const handleClearManualUV = async () => {
        try {
            await setManualUV(null);
            setManualUVState('');
            console.log('Manual UV cleared');
            Alert.alert('Success', 'Manual UV cleared. Using real-time data.');

            // Auto-navigate to apply changes
            setTimeout(() => {
                navigation.navigate('Home');
            }, 500);
        } catch (error) {
            console.error('Error clearing manual UV:', error);
            Alert.alert('Error', 'Failed to clear manual UV');
        }
    };

    const handleLoadDemoData = async () => {
        Alert.alert(
            'Load Demo Data',
            'This will create 7 days of fake history data for presentation purposes.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Load',
                    onPress: async () => {
                        try {
                            const success = await injectDemoData();
                            if (success) {
                                Alert.alert('Success', 'Demo data loaded! Check the History screen.');
                            } else {
                                Alert.alert('Error', 'Failed to load demo data');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to load demo data');
                        }
                    },
                },
            ]
        );
    };

    const handleResetApp = () => {
        Alert.alert(
            'Reset Setup?',
            'This will clear your setup preferences (skin type, sunscreen, UV settings) but keep your account. You will need to complete the 4 setup steps again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log('Resetting setup preferences...');

                            // Clear history and session data
                            await resetAllData();
                            console.log('Session data cleared');

                            // Clear ALL application data using centralized logic
                            await resetAllData();
                            console.log('✅ All data cleared - Account preserved');

                            // Navigate to SetupStep1 instead of reloading
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'SetupStep1' }],
                            });

                        } catch (error) {
                            console.error('Reset error:', error);
                            Alert.alert('Error', 'Reset failed: ' + error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account?',
            'This will permanently delete your account credentials. You will need to register again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log('Deleting account completely...');

                            // Clear ALL app data
                            await resetAllData();

                            // Delete account credentials + session
                            await deleteAccountAuth();
                            console.log('✅ Account deleted: credentials removed');

                            Alert.alert('Success', 'Account deleted.');

                            // Navigate to Auth screen
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Auth' }],
                            });

                        } catch (error) {
                            console.error('Delete account error:', error);
                            Alert.alert('Error', 'Delete failed: ' + error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleToggleAppLock = async () => {
        if (!appLockEnabled) {
            // Enabling App Lock
            if (!isRegistered) {
                Alert.alert(
                    'Setup Required',
                    'You need to create an account first to enable App Lock.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Create Account',
                            onPress: async () => {
                                // Enable App Lock first
                                await setAppLockEnabled(true);
                                // Reset to Auth screen
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Auth' }],
                                });
                            },
                        },
                    ]
                );
                return;
            }

            // Enable App Lock
            await setAppLockEnabled(true);
            setAppLockEnabledState(true);
            Alert.alert(
                'App Lock Enabled',
                'The app will now require authentication when launched or returning from background.'
            );
        } else {
            // Disabling App Lock
            Alert.alert(
                'Disable App Lock',
                'Are you sure you want to disable app lock protection?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Disable',
                        style: 'destructive',
                        onPress: async () => {
                            await setAppLockEnabled(false);
                            setAppLockEnabledState(false);
                            Alert.alert('App Lock Disabled', 'App lock has been turned off.');
                        },
                    },
                ]
            );
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout?',
            'You will need to login again to access the app.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Set logged out flag
                            await logout();
                            console.log('✅ Logged out successfully');

                            // Reset to Auth screen
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Auth' }],
                            });
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Error', 'Logout failed: ' + error.message);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View entering={FadeInDown}>
                    <Text style={styles.title}>Settings</Text>
                    <Text style={styles.subtitle}>Manage your app preferences</Text>
                </Animated.View>



                {/* App Lock Section */}
                <Animated.View
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>Security</Text>
                    <Text style={styles.sectionDescription}>
                        Optional app lock with password or biometric
                    </Text>

                    {/* Toggle App Lock */}
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleToggleAppLock}
                    >
                        <Text style={styles.actionButtonText}>
                            {appLockEnabled ? 'App Lock: ON' : 'App Lock: OFF'}
                        </Text>
                        <Text style={styles.actionButtonDescription}>
                            {appLockEnabled
                                ? 'Tap to disable app lock'
                                : 'Tap to enable app lock (requires account)'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Manual UV Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Manual UV Input</Text>
                    <Text style={styles.sectionDescription}>
                        Override API for offline demos/testing
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter UV Index (0-15)"
                            placeholderTextColor={COLORS.gray}
                            value={manualUV}
                            onChangeText={setManualUVState}
                            keyboardType="decimal-pad"
                        />
                        <TouchableOpacity style={styles.setButton} onPress={handleSetManualUV}>
                            <Text style={styles.setButtonText}>Set</Text>
                        </TouchableOpacity>
                    </View>

                    {manualUV && (
                        <TouchableOpacity style={styles.clearButton} onPress={handleClearManualUV}>
                            <Text style={styles.clearButtonText}>Clear Manual UV</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Account Settings (was Danger Zone) */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>
                        Account Settings
                    </Text>



                    <TouchableOpacity
                        style={[styles.actionButton, styles.dangerButton]}
                        onPress={handleResetApp}
                    >
                        <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>
                            Reset Setup
                        </Text>
                        <Text style={styles.actionButtonDescription}>
                            Clear setup preferences (keeps account)
                        </Text>
                    </TouchableOpacity>

                    {/* Delete Account */}
                    {isRegistered && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.dangerButton]}
                            onPress={handleDeleteAccount}
                        >
                            <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>
                                Delete Account
                            </Text>
                            <Text style={styles.actionButtonDescription}>
                                Permanently remove account credentials
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* App Info */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Suntime v1.0.0</Text>
                    <Text style={styles.footerText}>Built with React Native & Expo</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: moderateScale(100), // Ensure content clears tab bar
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: moderateScale(32),
        marginBottom: SPACING.xs,
        paddingTop: SPACING.md,
    },
    subtitle: {
        ...TYPOGRAPHY.caption,
        marginBottom: SPACING.xl,
        color: COLORS.textSecondary,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        ...TYPOGRAPHY.heading,
        marginBottom: SPACING.md,
    },
    sectionDescription: {
        ...TYPOGRAPHY.caption,
        marginBottom: SPACING.md,
        color: COLORS.textSecondary,
    },
    infoCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        ...SHADOWS.small,
    },
    infoLabel: {
        ...TYPOGRAPHY.caption,
        marginBottom: SPACING.xs,
        color: COLORS.textSecondary,
    },
    infoValue: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.text,
    },
    inputContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        ...TYPOGRAPHY.body,
        fontSize: moderateScale(16),
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    setButton: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
        paddingHorizontal: moderateScale(20),
        justifyContent: 'center',
        ...SHADOWS.button,
    },
    setButtonText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.white,
        fontWeight: '600',
        fontSize: moderateScale(16),
    },
    clearButton: {
        marginTop: SPACING.md,
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.primary,
        ...SHADOWS.small,
    },
    clearButtonText: {
        ...TYPOGRAPHY.body,
        color: COLORS.primary,
        textAlign: 'center',
        fontWeight: '600',
    },
    actionButton: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, // Reduced from lg to md for cleaner size
        marginBottom: SPACING.md,
        ...SHADOWS.small,
    },
    actionButtonText: {
        ...TYPOGRAPHY.subheading,
        marginBottom: SPACING.xs,
        fontWeight: '600',
        fontSize: moderateScale(18),
    },
    actionButtonDescription: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    dangerButton: {
        borderWidth: 2,
        borderColor: COLORS.danger,
    },
    footer: {
        marginTop: SPACING.xl,
        alignItems: 'center',
        paddingTop: SPACING.lg,
    },
    footerText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
});
