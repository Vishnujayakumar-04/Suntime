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
    saveCredentials,
    checkBiometricAvailable,
    setBiometricEnabled,
} from '../utils/auth';

export default function RegisterScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [enableBiometric, setEnableBiometric] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkBiometric();
    }, []);

    const checkBiometric = async () => {
        const available = await checkBiometricAvailable();
        setBiometricAvailable(available);
    };

    const validateInputs = () => {
        if (!username.trim()) {
            Alert.alert('Error', 'Please enter a username');
            return false;
        }

        if (username.length < 3) {
            Alert.alert('Error', 'Username must be at least 3 characters');
            return false;
        }

        if (!password) {
            Alert.alert('Error', 'Please enter a password');
            return false;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        return true;
    };

    const handleRegister = async () => {
        if (!validateInputs()) return;

        setLoading(true);
        try {
            // Save credentials
            const success = await saveCredentials(username.trim(), password);

            if (!success) {
                Alert.alert('Error', 'Failed to register. Please try again.');
                setLoading(false);
                return;
            }

            // Save biometric preference
            if (biometricAvailable && enableBiometric) {
                await setBiometricEnabled(true);
            }

            Alert.alert(
                'Success',
                'Registration complete!',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Navigate to Setup Wizard
                            navigation.replace('SetupStep1');
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert('Error', 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
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
                        entering={FadeInDown}
                        style={styles.header}
                    >
                        <Text style={styles.emoji}>☀️</Text>
                        <Text style={styles.title}>Welcome to Suntime</Text>
                        <Text style={styles.subtitle}>
                            Create your account to get started
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
                            />
                            <Text style={styles.hint}>Minimum 6 characters</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm password"
                                placeholderTextColor={COLORS.textSecondary}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Biometric Option */}
                        {biometricAvailable && (
                            <TouchableOpacity
                                style={styles.biometricOption}
                                onPress={() => setEnableBiometric(!enableBiometric)}
                            >
                                <View style={styles.checkbox}>
                                    {enableBiometric && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={styles.biometricText}>
                                    Enable biometric authentication
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Register Button */}
                        <TouchableOpacity
                            style={[styles.registerButton, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            <Text style={styles.registerButtonText}>
                                {loading ? 'Registering...' : 'Create Account'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Your data stays on your device. No cloud sync.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
    hint: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    biometricOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 2,
        borderColor: COLORS.primary,
        marginRight: SPACING.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    biometricText: {
        ...TYPOGRAPHY.body,
        flex: 1,
    },
    registerButton: {
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
    registerButtonText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.white,
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
        fontStyle: 'italic',
    },
});
