import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import {
    getUsername,
    verifyPassword,
    authenticateWithBiometric,
    checkBiometricAvailable,
    isBiometricEnabled,
} from '../utils/auth';

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    useEffect(() => {
        loadStoredUsername();
        checkBiometric();
    }, []);

    const loadStoredUsername = async () => {
        const storedUsername = await getUsername();
        if (storedUsername) {
            setUsername(storedUsername);
        }
    };

    const checkBiometric = async () => {
        const available = await checkBiometricAvailable();
        const enabled = await isBiometricEnabled();
        setBiometricAvailable(available && enabled);
        setBiometricEnabled(enabled);
    };

    const handleLogin = async () => {
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);
        try {
            const isValid = await verifyPassword(password);

            if (isValid) {
                // Check if setup is complete
                const { isSetupComplete } = await import('../utils/storage');
                const setupDone = await isSetupComplete();

                if (setupDone) {
                    // Setup complete - go to main app
                    navigation.replace('MainTabs');
                } else {
                    // Setup not complete - go to setup wizard
                    navigation.replace('SetupStep1');
                }
            } else {
                Alert.alert('Error', 'Incorrect password');
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        try {
            const success = await authenticateWithBiometric();

            if (success) {
                // Check if setup is complete
                const { isSetupComplete } = await import('../utils/storage');
                const setupDone = await isSetupComplete();

                if (setupDone) {
                    // Setup complete - go to main app
                    navigation.replace('MainTabs');
                } else {
                    // Setup not complete - go to setup wizard
                    navigation.replace('SetupStep1');
                }
            } else {
                Alert.alert('Authentication Failed', 'Please use your password');
            }
        } catch (error) {
            console.error('Biometric login error:', error);
            Alert.alert('Error', 'Biometric authentication failed');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <Animated.View
                        style={styles.header}
                    >
                        <Text style={styles.emoji}>☀️</Text>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>
                            Login to continue to Suntime
                        </Text>
                    </Animated.View>

                    {/* Form */}
                    <Animated.View
                        entering={FadeInDown}
                        style={styles.form}
                    >
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter username"
                                placeholderTextColor={COLORS.textSecondary}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={false}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter password"
                                placeholderTextColor={COLORS.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                onSubmitEditing={handleLogin}
                            />
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <Text style={styles.loginButtonText}>
                                {loading ? 'Logging in...' : 'Login'}
                            </Text>
                        </TouchableOpacity>

                        {/* Biometric Login */}
                        {biometricAvailable && (
                            <TouchableOpacity
                                style={styles.biometricButton}
                                onPress={handleBiometricLogin}
                            >
                                <Text style={styles.biometricButtonText}>
                                    🔐 Use Biometric
                                </Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Logged in as: <Text style={styles.footerUsername}>{username}</Text>
                        </Text>
                        <Text style={styles.footerHint}>
                            Your data is stored locally on this device
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: SPACING.lg,
        paddingTop: SPACING.xxl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    emoji: {
        fontSize: moderateScale(72),
        marginBottom: SPACING.lg,
    },
    title: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        textAlign: 'center',
        color: COLORS.textSecondary,
        paddingHorizontal: SPACING.lg,
    },
    form: {
        marginBottom: SPACING.xl,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        marginBottom: SPACING.sm,
        color: COLORS.text,
    },
    input: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        ...TYPOGRAPHY.body,
        fontSize: moderateScale(16),
        borderWidth: 2,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    loginButton: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md + 2,
        alignItems: 'center',
        marginTop: SPACING.md,
        ...SHADOWS.button,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.white,
        fontWeight: '600',
    },
    biometricButton: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md + 2,
        alignItems: 'center',
        marginTop: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.primary,
        ...SHADOWS.small,
    },
    biometricButtonText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.primary,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingTop: SPACING.xl,
    },
    footerText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    footerUsername: {
        fontWeight: '600',
        color: COLORS.primary,
    },
    footerHint: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
