import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GLASS } from '../constants/theme';
import { Shield, Check, Sun, ArrowLeft } from 'lucide-react-native';
import { saveDefaultPreferences } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { savePreferences } from '../services/firestore';
import StandardButton from '../components/common/StandardButton';

export default function SetupStep2Sunscreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const [useSunscreen, setUseSunscreen] = useState(null);

    const handleContinue = async () => {
        if (useSunscreen === null) {
            Alert.alert('Selection Required', 'Please select your typical sunscreen usage.');
            return;
        }

        try {
            const prefs = {
                sunscreen: useSunscreen,
                cloudy: false,
                uvPreference: 'gps'
            };

            // Save default preference locally
            await saveDefaultPreferences(prefs);

            // Also save to Firestore
            if (user) {
                await savePreferences(user.uid, prefs);
            }

            // Navigate to next step
            navigation.navigate('SetupStep3');
        } catch (error) {
            console.error('Error saving preferences:', error);
            Alert.alert('Error', 'Error saving your data. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Back Button Header */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '40%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 2 of 5</Text>
                </View>

                {/* Header */}
                <Animated.View
                    entering={FadeInDown}
                    style={styles.header}
                >
                    <Shield color={colors.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
                    <Text style={styles.title}>Sunscreen Usage</Text>
                    <Text style={styles.subtitle}>
                        Do you typically use sunscreen when going outside? This sets your default preference.
                    </Text>
                </Animated.View>

                {/* Options */}
                <View style={styles.optionsContainer}>
                    <Animated.View entering={FadeInDown}>
                        <TouchableOpacity
                            style={[
                                styles.optionCard,
                                useSunscreen === true && styles.optionCardSelected,
                            ]}
                            onPress={() => setUseSunscreen(true)}
                        >
                            <View style={styles.optionContent}>
                                <Check color={colors.primary} size={moderateScale(32)} style={{ marginRight: SPACING.md }} />
                                <View style={styles.optionText}>
                                    <Text style={styles.optionTitle}>Yes, I use sunscreen</Text>
                                    <Text style={styles.optionDescription}>
                                        Safe exposure times will be extended
                                    </Text>
                                </View>
                            </View>
                            {useSunscreen === true && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown}>
                        <TouchableOpacity
                            style={[
                                styles.optionCard,
                                useSunscreen === false && styles.optionCardSelected,
                            ]}
                            onPress={() => setUseSunscreen(false)}
                        >
                            <View style={styles.optionContent}>
                                <Sun color={colors.primary} size={moderateScale(32)} style={{ marginRight: SPACING.md }} />
                                <View style={styles.optionText}>
                                    <Text style={styles.optionTitle}>No, I don't use sunscreen</Text>
                                    <Text style={styles.optionDescription}>
                                        Safe exposure times will be shorter
                                    </Text>
                                </View>
                            </View>
                            {useSunscreen === false && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Info Note */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        You can change this anytime in Settings or toggle it on the Home screen for specific sessions.
                    </Text>
                </View>

                {/* Continue Button */}
                <StandardButton
                    title="Continue"
                    onPress={handleContinue}
                    disabled={useSunscreen === null}
                />
            </ScrollView>
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
        lineHeight: moderateScale(24),
    },
    optionsContainer: {
        marginBottom: SPACING.lg,
    },
    optionCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 2,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    optionCardSelected: {
        borderColor: colors.primary,
        borderWidth: 3,
        ...SHADOWS.medium,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionEmoji: {
        fontSize: moderateScale(32),
        marginRight: SPACING.md,
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        marginBottom: SPACING.xs,
        color: colors.text,
    },
    optionDescription: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
    },
    checkmark: {
        fontSize: moderateScale(28),
        color: colors.primary,
    },
    infoCard: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    infoText: {
        ...TYPOGRAPHY.body,
        lineHeight: 22,
        color: colors.text,
    },
    continueButton: {
        backgroundColor: colors.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md + 2,
        alignItems: 'center',
        ...SHADOWS.button,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    continueButtonText: {
        ...TYPOGRAPHY.subheading,
        color: colors.white,
        fontWeight: '600',
    },
    backButton: {
        position: 'absolute',
        top: SPACING.lg,
        left: SPACING.lg,
        zIndex: 10,
        padding: SPACING.sm,
    },
});
