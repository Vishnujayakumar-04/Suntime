import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Linking,
    Alert,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GLASS } from '../constants/theme';
import { MapPin, Edit2, CloudSun, Check, AlertTriangle, BookOpen } from 'lucide-react-native';
import { setManualUV, getDefaultPreferences, saveDefaultPreferences } from '../utils/storage';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { savePreferences } from '../services/firestore';
import StandardButton from '../components/common/StandardButton';

export default function SetupStep3Location({ navigation }) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const [mode, setMode] = useState('gps'); // 'gps' or 'manual'
    const [permissionGranted, setPermissionGranted] = useState(null);
    const [isRequesting, setIsRequesting] = useState(false);
    const [manualUV, setManualUVValue] = useState('');

    useEffect(() => {
        checkExistingPermission();
    }, []);

    const checkExistingPermission = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
                setPermissionGranted(true);
            }
        } catch (error) {
            console.error('Error checking permission:', error);
        }
    };

    const handleRequestPermission = async () => {
        setIsRequesting(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setPermissionGranted(status === 'granted');
        } catch (error) {
            console.error('Error requesting permission:', error);
            Alert.alert('Permission Error', 'Failed to request location permission. Please enable it in system settings.');
        } finally {
            setIsRequesting(false);
        }
    };

    const handleOpenUVGuide = () => {
        // Open UV Index guide link
        Linking.openURL('https://www.epa.gov/sunsafety/uv-index-scale-0');
    };

    const handleContinue = async () => {
        if (mode === 'manual') {
            // Validate and save manual UV
            const uvValue = parseFloat(manualUV);
            if (isNaN(uvValue) || uvValue < 0 || uvValue > 15) {
                Alert.alert('Invalid Input', 'Please enter a valid UV index between 0 and 15.');
                return;
            }

            try {
                await setManualUV(uvValue);
                console.log('Manual UV saved:', uvValue);
            } catch (error) {
                console.error('Error saving manual UV:', error);
                Alert.alert('Error', 'Failed to save UV value. Please try again.');
                return;
            }
        }

        // Save UV preference to Firestore
        if (user) {
            try {
                // Get existing preferences and merge with UV preference
                const existingPrefs = await getDefaultPreferences() || {};
                const updatedPrefs = {
                    ...existingPrefs,
                    uvPreference: mode // 'gps' or 'manual'
                };

                await savePreferences(user.uid, updatedPrefs);
                await saveDefaultPreferences(updatedPrefs);
            } catch (error) {
                console.error('Error saving UV preference:', error);
            }
        }

        // Continue to next step
        navigation.navigate('SetupStep4');
    };

    const canContinue = () => {
        if (mode === 'gps') {
            return permissionGranted !== null;
        } else {
            return manualUV !== '' && !isNaN(parseFloat(manualUV));
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Progress Indicator */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: '75%' }]} />
                        </View>
                        <Text style={styles.progressText}>Step 3 of 4</Text>
                    </View>

                    {/* Header */}
                    <Animated.View
                        entering={FadeInDown}
                        style={styles.header}
                    >
                        <CloudSun color={colors.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
                        <Text style={styles.title}>UV Data Source</Text>
                        <Text style={styles.subtitle}>
                            Choose how to get UV Index data
                        </Text>
                    </Animated.View>

                    {/* Mode Selector */}
                    <Animated.View
                        entering={FadeInDown}
                        style={styles.modeContainer}
                    >
                        <TouchableOpacity
                            style={[styles.modeButton, mode === 'gps' && styles.modeButtonActive]}
                            onPress={() => setMode('gps')}
                        >
                            <MapPin color={mode === 'gps' ? colors.primary : colors.textSecondary} size={32} style={{ marginBottom: SPACING.sm }} />
                            <Text style={[styles.modeText, mode === 'gps' && styles.modeTextActive]}>
                                GPS Location
                            </Text>
                            <Text style={styles.modeDescription}>Automatic</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
                            onPress={() => setMode('manual')}
                        >
                            <Edit2 color={mode === 'manual' ? colors.primary : colors.textSecondary} size={32} style={{ marginBottom: SPACING.sm }} />
                            <Text style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>
                                Manual UV
                            </Text>
                            <Text style={styles.modeDescription}>Enter yourself</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Step Content */}
                    <Animated.View
                        style={{ flex: 1 }}
                    >
                        {/* GPS Mode Content */}
                        {mode === 'gps' && (
                            <>
                                <View style={styles.infoCard}>
                                    <Text style={styles.infoTitle}>Automatic UV Data</Text>
                                    <Text style={styles.infoText}>
                                        We'll use your location to fetch real-time UV Index from weather services.
                                    </Text>
                                    <Text style={styles.infoText}>
                                        • Accurate UV for your area{'\n'}
                                        • Updates automatically{'\n'}
                                        • Privacy-friendly (local only)
                                    </Text>
                                </View>

                                {permissionGranted === null && (
                                    <StandardButton
                                        title={isRequesting ? 'Requesting...' : 'Allow Location Access'}
                                        onPress={handleRequestPermission}
                                        disabled={isRequesting}
                                        style={{ marginBottom: SPACING.lg }}
                                    />
                                )}

                                {permissionGranted === true && (
                                    <View style={styles.successCard}>
                                        <Check color="#2E7D32" size={28} style={{ marginRight: SPACING.md }} />
                                        <Text style={styles.successText}>Location permission granted!</Text>
                                    </View>
                                )}

                                {permissionGranted === false && (
                                    <View style={styles.warningCard}>
                                        <AlertTriangle color="#E65100" size={28} style={{ marginRight: SPACING.md }} />
                                        <Text style={styles.warningText}>
                                            Permission denied. Switch to Manual UV or try again.
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}

                        {/* Manual UV Mode Content */}
                        {mode === 'manual' && (
                            <>
                                <View style={styles.infoCard}>
                                    <Text style={styles.infoTitle}>Manual UV Input</Text>
                                    <Text style={styles.infoText}>
                                        Enter the current UV Index for your location manually.
                                    </Text>
                                    <Text style={styles.infoText}>
                                        Good for:{'\n'}
                                        • Offline use{'\n'}
                                        • Testing the app{'\n'}
                                        • No location permission
                                    </Text>
                                </View>

                                {/* UV Guide Link */}
                                <TouchableOpacity style={styles.guideCard} onPress={handleOpenUVGuide}>
                                    <View style={styles.guideContent}>
                                        <BookOpen color={colors.primary} size={28} style={{ marginRight: SPACING.md }} />
                                        <View style={styles.guideTextContainer}>
                                            <Text style={styles.guideTitle}>What is UV Index?</Text>
                                            <Text style={styles.guideDescription}>
                                                Tap to learn about UV scale (0-15)
                                            </Text>
                                        </View>
                                        <Text style={styles.guideLinkIcon}>→</Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Manual UV Input */}
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Enter UV Index (0-15):</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 5"
                                        placeholderTextColor={colors.textSecondary}
                                        value={manualUV}
                                        onChangeText={setManualUVValue}
                                        keyboardType="numeric"
                                        maxLength={4}
                                    />
                                    <Text style={styles.inputHint}>
                                        Check your weather app or Google "UV index [your city]"
                                    </Text>
                                </View>
                            </>
                        )}
                    </Animated.View>

                    {/* Continue Button */}
                    <StandardButton
                        title="Continue"
                        onPress={handleContinue}
                        disabled={!canContinue()}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingBottom: SPACING.xxl,
    },
    progressContainer: {
        marginBottom: SPACING.xl,
    },
    progressBar: {
        height: moderateScale(6),
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    progressText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    emoji: {
        fontSize: moderateScale(64),
        marginBottom: SPACING.md,
    },
    title: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
        marginBottom: SPACING.sm,
        color: colors.text,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        textAlign: 'center',
        color: colors.textSecondary,
        paddingHorizontal: SPACING.md,
    },
    modeContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    modeButton: {
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    modeButtonActive: {
        borderColor: colors.primary,
        backgroundColor: colors.backgroundLight,
    },
    modeEmoji: {
        fontSize: 32,
        marginBottom: SPACING.sm,
    },
    modeText: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: SPACING.xs,
    },
    modeTextActive: {
        color: colors.primary,
    },
    modeDescription: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
    },
    infoCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    infoTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        marginBottom: SPACING.sm,
        color: colors.text,
    },
    infoText: {
        ...TYPOGRAPHY.body,
        lineHeight: 22,
        marginBottom: SPACING.xs,
        color: colors.text,
    },
    guideCard: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    guideContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    guideEmoji: {
        fontSize: 28,
        marginRight: SPACING.md,
    },
    guideTextContainer: {
        flex: 1,
    },
    guideTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        color: '#1976D2',
        marginBottom: SPACING.xs,
    },
    guideDescription: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
    },
    guideLinkIcon: {
        fontSize: 24,
        color: colors.primary,
    },
    uvReferenceCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    uvReferenceTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        marginBottom: SPACING.sm,
        color: colors.text,
    },
    uvReferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    uvLevel: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        width: 80,
    },
    uvLevelText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
    },
    inputContainer: {
        marginBottom: SPACING.lg,
    },
    inputLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        marginBottom: SPACING.sm,
        color: colors.text,
    },
    input: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        ...TYPOGRAPHY.body,
        borderWidth: 2,
        borderColor: colors.primary,
        fontSize: moderateScale(20),
        textAlign: 'center',
        ...SHADOWS.small,
        color: colors.text,
    },
    inputHint: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    warningText: {
        ...TYPOGRAPHY.body,
        color: '#E65100',
        flex: 1,
    },
});
