import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    InteractionManager,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    withSpring,
    withSequence
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS, COLORS } from '../constants/theme';
import { isSetupComplete } from '../utils/storage';
import { getUserProfile } from '../services/firebaseFirestore';
import { resetPassword as firebaseResetPassword } from '../services/firebaseAuth';
import StandardButton from '../components/common/StandardButton';

export default function AuthScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const { signIn, signUp, isAuthenticated, user, loading: authLoading } = useAuth();
    const styles = useMemo(() => getStyles(colors), [colors]);

    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const EyeIcon = ({ hide, size, color }) => {
        return hide ? <EyeOff size={size} color={color} /> : <Eye size={size} color={color} />;
    };

    // Animation values
    const sunRotation = useSharedValue(0);

    const emailInputRef = React.useRef(null);
    const passwordInputRef = React.useRef(null);
    const nameInputRef = React.useRef(null);

    useEffect(() => {
        console.log('🔒 AuthScreen Mounted!');
    }, []);

    // Reset state when screen focus changes
    useFocusEffect(
        useCallback(() => {
            // Reset form fields when screen gains focus
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setDisplayName('');
            setLoading(false);
            setShowPassword(false);
            setShowConfirmPassword(false);
            setMode('login'); // Default to login when screen is focused

            return () => {
                // Optional: Cleanup when screen loses focus
            };
        }, [])
    );

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                try {
                    sunRotation.value = withRepeat(
                        withTiming(360, { duration: 10000 }),
                        -1,
                        false
                    );
                } catch (error) {
                    console.error('Animation initialization error:', error);
                }
            });
        });

        return () => task.cancel();
    }, []);

    const animatedSunStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${sunRotation.value}deg` }],
    }));

    // Handle navigation when user becomes authenticated
    useEffect(() => {
        const handleAuthChange = async () => {
            if (isAuthenticated && user) {
                // Check if setup is complete
                const profileResult = await getUserProfile(user.uid);
                const setupDone = profileResult.data?.setupCompleted || await isSetupComplete();

                if (setupDone) {
                    navigation.replace('MainTabs');
                } else {
                    navigation.replace('SetupStep1');
                }
            }
        };

        handleAuthChange();
    }, [isAuthenticated, user]);

    const handleRegister = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        if (!password || password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const result = await signUp(email, password, displayName || email.split('@')[0]);

            if (result.success) {
                // Navigation is handled by the useEffect above
                console.log('✅ Registration successful');
            } else {
                Alert.alert('Registration Failed', result.error);
            }
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert('Error', 'Registration failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);
        try {
            const result = await signIn(email, password);

            if (result.success) {
                // Navigation is handled by the useEffect above
                console.log('✅ Login successful');
            } else {
                Alert.alert('Login Failed', result.error);
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', 'Login failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert('Email Required', 'Please enter your email address to reset your password.');
            return;
        }

        setLoading(true);
        try {
            const result = await firebaseResetPassword(email);

            if (result.success) {
                Alert.alert(
                    'Password Reset Email Sent',
                    'Check your email inbox for instructions to reset your password.'
                );
            } else {
                Alert.alert('Error', result.error);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const isFormLoading = loading || authLoading;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? GRADIENTS.night : GRADIENTS.sunrise}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Animated.View
                            entering={FadeInDown}
                            style={styles.content}
                        >
                            {/* Header with sun animation */}
                            <View style={styles.header}>
                                <Animated.View style={[styles.sunContainer, animatedSunStyle]}>
                                    <Text style={styles.sunIcon}>🌞</Text>
                                </Animated.View>
                                <Text style={styles.title}>Suntime</Text>
                                <Text style={styles.subtitle}>
                                    Your safe sun exposure companion
                                </Text>
                            </View>

                            {/* Mode Switcher */}
                            <View style={styles.modeContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.modeButton,
                                        mode === 'login' && styles.modeButtonActive,
                                    ]}
                                    onPress={() => setMode('login')}
                                >
                                    <Text
                                        style={[
                                            styles.modeText,
                                            mode === 'login' && styles.modeTextActive,
                                        ]}
                                    >
                                        Login
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.modeButton,
                                        mode === 'register' && styles.modeButtonActive,
                                    ]}
                                    onPress={() => setMode('register')}
                                >
                                    <Text
                                        style={[
                                            styles.modeText,
                                            mode === 'register' && styles.modeTextActive,
                                        ]}
                                    >
                                        Register
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Form Card */}
                            <View style={styles.formCard}>
                                {/* Display Name (Register only) */}
                                {mode === 'register' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Display Name</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter your name"
                                                placeholderTextColor={colors.textLight}
                                                value={displayName}
                                                onChangeText={setDisplayName}
                                                autoCapitalize="words"
                                            />
                                        </View>
                                        <Text style={styles.hint}>Optional - defaults to email username</Text>
                                    </View>
                                )}

                                {/* Email Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Email</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your email"
                                            placeholderTextColor={colors.textLight}
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            autoComplete="email"
                                        />
                                    </View>
                                </View>

                                {/* Password Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Password</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter password"
                                            placeholderTextColor={colors.textLight}
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: 12, top: 12 }}
                                        >
                                            <EyeIcon hide={showPassword} size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    {mode === 'register' && (
                                        <Text style={styles.hint}>Minimum 6 characters</Text>
                                    )}
                                </View>

                                {/* Confirm Password (Register only) */}
                                {mode === 'register' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Confirm Password</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Re-enter password"
                                                placeholderTextColor={colors.textLight}
                                                value={confirmPassword}
                                                onChangeText={setConfirmPassword}
                                                secureTextEntry={!showConfirmPassword}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                                style={{ position: 'absolute', right: 12, top: 12 }}
                                            >
                                                <EyeIcon hide={showConfirmPassword} size={20} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* Forgot Password Link (Login only) */}
                                {mode === 'login' && (
                                    <TouchableOpacity
                                        style={{ alignSelf: 'flex-end', marginBottom: SPACING.sm }}
                                        onPress={handleForgotPassword}
                                    >
                                        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                                            Forgot Password?
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* Action Button */}
                                <StandardButton
                                    title={isFormLoading
                                        ? 'Processing...'
                                        : (mode === 'login' ? 'Login' : 'Register')}
                                    onPress={mode === 'login' ? handleLogin : handleRegister}
                                    loading={isFormLoading}
                                    disabled={isFormLoading}
                                    style={{ marginTop: SPACING.md }}
                                />
                            </View>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Text style={styles.footerText}>
                                    🔐 Secured with Firebase Authentication
                                </Text>
                            </View>
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.lg,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    sunContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    sunIcon: {
        fontSize: moderateScale(60),
        color: COLORS.white,
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    title: {
        fontSize: moderateScale(32),
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: moderateScale(14),
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        fontWeight: '500',
    },
    modeContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: BORDER_RADIUS.lg,
        padding: 3,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        maxWidth: 300,
        alignSelf: 'center',
        width: '100%',
    },
    modeButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.md,
    },
    modeButtonActive: {
        backgroundColor: colors.primary,
        ...SHADOWS.small,
    },
    modeText: {
        ...TYPOGRAPHY.subheading,
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 14,
    },
    modeTextActive: {
        color: colors.white,
    },
    formCard: {
        ...(colors === '#121212' || colors.background === '#121212' ? GLASS.dark : GLASS.default),
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.large,
        width: '100%',
    },
    inputGroup: {
        marginBottom: SPACING.md,
    },
    label: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        marginBottom: 4,
        color: colors.text,
        fontSize: 13,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: SPACING.md,
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        fontSize: moderateScale(15),
        color: colors.text,
    },
    hint: {
        fontSize: moderateScale(11),
        color: colors.textLight,
        marginTop: 2,
        fontStyle: 'italic',
    },
    footer: {
        alignItems: 'center',
        paddingTop: SPACING.lg,
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
