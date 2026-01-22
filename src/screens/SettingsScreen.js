import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    Platform,
    Switch,
    Modal,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, COLORS, GLASS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, UserX, RefreshCw, Key, ChevronRight, ShieldCheck, ShieldAlert, Trash2, LogOut } from 'lucide-react-native';

import {
    getUserSettings,
    getManualUV,
    setManualUV,
    resetAllData,
    injectDemoData,
} from '../utils/storage';
import { saveUserToFirestore, resetUserProfile } from '../services/firestore';

import {
    isAppLockEnabled,
    setAppLockEnabled,
    isUserRegistered,
    checkBiometricAvailable,
    authenticateWithBiometric,
    logout as localLogout,
    deleteAccount as deleteAccountAuth,
    changePassword,
} from '../utils/auth';
import StandardButton from '../components/common/StandardButton';

export default function SettingsScreen({ navigation }) {
    const { colors, isDark, toggleTheme } = useTheme();
    const { signOut, user } = useAuth();

    // Dynamic Styles
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [manualUV, setManualUVState] = useState('');
    const [appLockEnabled, setAppLockEnabledState] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    // Password Update State
    const [modalVisible, setModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    // Handle Logout with Firebase
    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                        } catch (error) {
                            Alert.alert('Error', 'Logout failed: ' + error.message);
                        }
                    }
                }
            ]
        );
    };

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

    // ... (Handlers kept same logic, just purely UI refactor) ...
    // To save lines, I'll keep the logic handlers concise or assume they are unchanged if not shown, 
    // but here I need to replace the whole file content effectively to ensure styles are applied.
    // Copying logic handlers...

    const handleSetManualUV = async () => {
        const uvValue = parseFloat(manualUV);
        if (isNaN(uvValue) || uvValue < 0 || uvValue > 15) {
            Alert.alert('Invalid UV Index', 'Please enter a value between 0-15.');
            return;
        }
        try {
            await setManualUV(uvValue);
            Alert.alert('Success', `Manual UV set to ${uvValue.toFixed(1)}.`);
            setTimeout(() => { navigation.navigate('Home'); }, 500);
        } catch (error) {
            console.error('Error setting manual UV:', error);
            Alert.alert('Error', 'Failed to set manual UV: ' + error.message);
        }
    };

    const handleClearManualUV = async () => {
        try {
            await setManualUV(null);
            setManualUVState('');
            Alert.alert('Success', 'Manual UV cleared. Using real-time data.');
            setTimeout(() => { navigation.navigate('Home'); }, 500);
        } catch (error) {
            console.error('Error clearing manual UV:', error);
            Alert.alert('Error', 'Failed to clear manual UV');
        }
    };

    const handleResetApp = () => {
        Alert.alert(
            'Reset Setup?',
            'This will clear your setup preferences (skin type, sunscreen, UV settings) but keep your account.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await resetAllData();

                            if (user) {
                                await resetUserProfile(user.uid);
                            }

                            navigation.reset({ index: 0, routes: [{ name: 'SetupStep1' }] });
                        } catch (error) {
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
                            // First wipe data to be safe
                            if (user) {
                                await resetUserProfile(user.uid);
                            }
                            await resetAllData();
                            await deleteAccountAuth();
                            Alert.alert('Success', 'Account deleted.');
                            navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                        } catch (error) {
                            Alert.alert('Error', 'Delete failed: ' + error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleToggleAppLock = async () => {
        if (!appLockEnabled) {
            if (!isRegistered) {
                Alert.alert('Setup Required', 'You need to create an account first.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Create Account', onPress: async () => { await setAppLockEnabled(true); navigation.reset({ index: 0, routes: [{ name: 'Auth' }] }); } }
                ]);
                return;
            }
            await setAppLockEnabled(true);
            setAppLockEnabledState(true);
            Alert.alert('App Lock Enabled', 'The app will now use your phone\'s screen lock.');
        } else {
            Alert.alert('Disable App Lock', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disable', style: 'destructive', onPress: async () => { await setAppLockEnabled(false); setAppLockEnabledState(false); Alert.alert('App Lock Disabled', 'App lock turned off.'); } }
            ]);
        }
    };

    // Component for Section Header
    const SettingsSection = ({ title, children, icon: Icon, color }) => (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                {Icon && <Icon size={18} color={color || colors.text} style={{ marginRight: 8 }} />}
                <Text style={[styles.sectionTitle, color && { color }]}>{title}</Text>
            </View>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );

    const ActionItem = ({ label, description, onPress, icon: Icon, isDanger, valueComponent }) => (
        <TouchableOpacity
            style={[styles.actionItem, isDanger && styles.actionItemDanger]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.actionItemIcon}>
                {Icon && <Icon size={20} color={isDanger ? colors.danger : colors.textSecondary} />}
            </View>
            <View style={styles.actionItemText}>
                <Text style={[styles.actionLabel, isDanger && { color: colors.danger }]}>{label}</Text>
                {description && <Text style={styles.actionDescription}>{description}</Text>}
            </View>
            <View style={styles.actionItemRight}>
                {valueComponent ? valueComponent : <ChevronRight size={18} color={styles.arrowColor.color} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={isDark ? ['#121212', '#1E1E1E'] : ['#F5F7FA', '#FFFFFF']}
                style={StyleSheet.absoluteFillObject}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(600)}>
                    <Text style={styles.title}>Settings</Text>
                    <Text style={styles.subtitle}>Preferences & Account</Text>
                </Animated.View>

                {/* Security Section */}
                <Animated.View entering={FadeInDown.delay(100).duration(600)}>
                    <LinearGradient
                        colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['#FFFFFF', '#F8F9FA']}
                        style={styles.card}
                    >
                        <SettingsSection title="Security" icon={ShieldCheck}>
                            <ActionItem
                                icon={Lock}
                                label="App Lock"
                                description={appLockEnabled ? "Enabled (Tap to disable)" : "Disabled (Tap to enable)"}
                                onPress={handleToggleAppLock}
                                valueComponent={
                                    <Switch
                                        value={appLockEnabled}
                                        onValueChange={handleToggleAppLock}
                                        trackColor={{ false: '#767577', true: COLORS.primary }}
                                        thumbColor={'#f4f3f4'}
                                    />
                                }
                            />
                        </SettingsSection>
                    </LinearGradient>
                </Animated.View>

                {/* Account Section */}
                <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                    <LinearGradient
                        colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['#FFFFFF', '#F8F9FA']}
                        style={styles.card}
                    >
                        <SettingsSection title="Account" icon={UserX} color={colors.text}>
                            {isRegistered && (
                                <ActionItem
                                    icon={Key}
                                    label="Change Password"
                                    description="Update your login credentials"
                                    onPress={() => setModalVisible(true)}
                                />
                            )}

                            <ActionItem
                                icon={RefreshCw}
                                label="Reset Setup"
                                description="Clear skin type & settings"
                                onPress={handleResetApp}
                            />

                            {isRegistered && (
                                <ActionItem
                                    icon={Trash2}
                                    label="Delete Account"
                                    description="Permanently remove your data"
                                    onPress={handleDeleteAccount}
                                    isDanger
                                />
                            )}

                            {/* Logout Button */}
                            {user && (
                                <ActionItem
                                    icon={LogOut}
                                    label="Logout"
                                    description={`Signed in as ${user.email}`}
                                    onPress={handleLogout}
                                />
                            )}
                        </SettingsSection>
                    </LinearGradient>
                </Animated.View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Suntime v1.0.0</Text>
                    <Text style={styles.footerSubText}>Designed for Hackathon 2026</Text>
                </View>
            </ScrollView>

            {/* Change Password Modal - Glassmorphism */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContentWrapper}>
                        <LinearGradient
                            colors={isDark ? ['#2C2C2C', '#222'] : ['#FFFFFF', '#F8F9FA']}
                            style={styles.modalContent}
                        >
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <Text style={styles.modalSubtitle}>Enter your current password and a new one.</Text>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Current Password"
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                            />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="New Password"
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Confirm New Password"
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                            />

                            <View style={styles.modalButtons}>
                                <StandardButton
                                    title="Cancel"
                                    onPress={() => {
                                        setModalVisible(false);
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    }}
                                    variant="ghost"
                                    style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }}
                                    textStyle={{ color: colors.text }}
                                />

                                <StandardButton
                                    title={passwordLoading ? 'Updating...' : 'Update'}
                                    onPress={async () => {
                                        if (!currentPassword || !newPassword || !confirmPassword) {
                                            Alert.alert('Error', 'Please fill all fields');
                                            return;
                                        }
                                        if (newPassword !== confirmPassword) {
                                            Alert.alert('Error', 'New passwords do not match');
                                            return;
                                        }
                                        setPasswordLoading(true);
                                        const result = await changePassword(currentPassword, newPassword);
                                        setPasswordLoading(false);
                                        if (result.success) {
                                            Alert.alert('Success', 'Password updated successfully');
                                            setModalVisible(false);
                                            setCurrentPassword('');
                                            setNewPassword('');
                                            setConfirmPassword('');
                                        } else {
                                            Alert.alert('Error', result.error);
                                        }
                                    }}
                                    loading={passwordLoading}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </LinearGradient>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: moderateScale(100),
    },
    title: {
        fontSize: moderateScale(32),
        fontWeight: '800',
        color: colors.text,
        marginBottom: SPACING.xs,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: moderateScale(14),
        color: colors.textSecondary,
        marginBottom: SPACING.xl,
        fontWeight: '500',
    },
    card: {
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)',
        ...SHADOWS.small,
        backgroundColor: 'transparent', // controlled by Gradient
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: SPACING.sm,
        opacity: 0.8,
    },
    sectionTitle: {
        fontSize: moderateScale(14),
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.text,
    },
    sectionContent: {
        gap: SPACING.sm,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    actionItemDanger: {
        // any specific danger styles if needed
    },
    actionItemIcon: {
        width: 32,
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    actionItemText: {
        flex: 1,
    },
    actionLabel: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    actionDescription: {
        fontSize: moderateScale(12),
        color: colors.textSecondary,
    },
    actionItemRight: {
        paddingLeft: SPACING.sm,
    },
    arrowColor: {
        color: colors.textSecondary, // helper for icon color
    },
    footer: {
        marginTop: SPACING.xl,
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        opacity: 0.6,
    },
    footerText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        color: colors.text,
    },
    footerSubText: {
        fontSize: moderateScale(12),
        color: colors.textSecondary,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    modalContentWrapper: {
        ...SHADOWS.large,
        borderRadius: BORDER_RADIUS.xl,
    },
    modalContent: {
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)',
    },
    modalTitle: {
        fontSize: moderateScale(22),
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: moderateScale(14),
        color: colors.textSecondary,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#F0F2F5',
        color: colors.text,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        fontSize: moderateScale(16),
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: SPACING.md,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginTop: SPACING.sm,
    },
});
