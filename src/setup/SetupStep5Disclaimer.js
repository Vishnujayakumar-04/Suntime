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
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GLASS } from '../constants/theme';
import { AlertTriangle, Info, ShieldAlert, Heart, Activity, ArrowLeft } from 'lucide-react-native';
import { completeSetup, saveDisclaimerAcceptance } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { markSetupCompleted, fetchUserData } from '../services/firestore';
import StandardButton from '../components/common/StandardButton';

import * as Notifications from 'expo-notifications';

export default function SetupStep5Disclaimer({ navigation }) {
    const { colors, isDark } = useTheme();
    const { user, refreshProfile } = useAuth();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const [accepted, setAccepted] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    const handleComplete = async () => {
        if (!accepted) {
            Alert.alert('Required', 'Please check the box to accept the disclaimer');
            return;
        }

        setIsCompleting(true);
        try {
            // Request Notification Permissions
            const { status } = await Notifications.requestPermissionsAsync();
            console.log('Notification permission status:', status);

            console.log('Completing setup...');

            // Save disclaimer acceptance locally
            await saveDisclaimerAcceptance();

            // Mark setup as complete locally
            await completeSetup();

            // CRITICAL: Save setupCompleted: true to Firestore
            if (user) {
                const result = await markSetupCompleted(user.uid);
                console.log('Firestore setupCompleted result:', result);

                if (!result.success) {
                    throw new Error('Failed to save setup status to cloud.');
                }

                // Double check it saved
                const profile = await fetchUserData(user.uid);
                if (!profile?.setupCompleted) {
                    // Try one more time with verify
                    await markSetupCompleted(user.uid);
                }

                // Refresh the auth context profile so navigation works correctly
                await refreshProfile();
            }

            console.log('✅ Setup marked as complete in Firestore!');

            // Navigate directly to main app
            setIsCompleting(false);
            navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
            });

        } catch (error) {
            console.error('Error completing setup:', error);
            setIsCompleting(false);
            Alert.alert('Error', 'Failed to complete setup: ' + error.message);
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
                        <View style={[styles.progressFill, { width: '100%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 5 of 5</Text>
                </View>

                {/* Header */}
                <Animated.View
                    entering={FadeInDown}
                    style={styles.header}
                >
                    <AlertTriangle color={colors.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
                    <Text style={styles.title}>Important Health Notice</Text>
                </Animated.View>

                {/* Disclaimer Content */}
                <Animated.View
                    entering={ZoomIn}
                    style={styles.disclaimerCard}
                >
                    <Text style={styles.disclaimerTitle}>Please Read Carefully</Text>

                    <View style={styles.disclaimerSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                            <Info color={colors.primary} size={20} style={{ marginRight: SPACING.sm }} />
                            <Text style={styles.disclaimerHeading}>Estimates Only</Text>
                        </View>
                        <Text style={styles.disclaimerText}>
                            This app provides general guidance and estimates for safe sun exposure.
                            It is NOT a substitute for professional medical advice, diagnosis, or treatment.
                        </Text>
                    </View>

                    <View style={styles.disclaimerSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                            <ShieldAlert color={colors.primary} size={20} style={{ marginRight: SPACING.sm }} />
                            <Text style={styles.disclaimerHeading}>Consult Healthcare Professionals</Text>
                        </View>
                        <Text style={styles.disclaimerText}>
                            Always consult your physician or qualified healthcare provider before
                            making decisions about sun exposure, especially if you have skin conditions
                            or medical history.
                        </Text>
                    </View>

                    <View style={styles.disclaimerSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                            <Activity color={colors.primary} size={20} style={{ marginRight: SPACING.sm }} />
                            <Text style={styles.disclaimerHeading}>Never Burn</Text>
                        </View>
                        <Text style={styles.disclaimerText}>
                            The goal is SAFE sun exposure for Vitamin D, not tanning or burning.
                            Stop immediately if your skin shows any signs of burning.
                        </Text>
                    </View>

                    <View style={styles.disclaimerSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                            <Heart color={colors.primary} size={20} style={{ marginRight: SPACING.sm }} />
                            <Text style={styles.disclaimerHeading}>Listen to Your Body</Text>
                        </View>
                        <Text style={styles.disclaimerText}>
                            Everyone's skin reacts differently. Use this app as a guide, but always
                            prioritize how your own body responds to sun exposure.
                        </Text>
                    </View>
                </Animated.View>

                {/* Acceptance Checkbox */}
                <TouchableOpacity
                    style={styles.acceptanceContainer}
                    onPress={() => setAccepted(!accepted)}
                >
                    <View style={[styles.checkbox, accepted && styles.checkboxAccepted]}>
                        {accepted && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.acceptanceText}>
                        I have read and understand this health notice
                    </Text>
                </TouchableOpacity>

                {/* Complete Button */}
                <StandardButton
                    title={isCompleting ? 'Completing Setup...' : 'Complete Setup'}
                    onPress={handleComplete}
                    disabled={!accepted || isCompleting}
                    loading={isCompleting}
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
        color: colors.text,
    },
    disclaimerCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.xl,
        borderWidth: 2,
        borderColor: colors.border,
        ...SHADOWS.medium,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    disclaimerTitle: {
        ...TYPOGRAPHY.heading,
        marginBottom: SPACING.lg,
        textAlign: 'center',
        color: colors.primary,
    },
    disclaimerSection: {
        marginBottom: SPACING.lg,
    },
    disclaimerHeading: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
        marginBottom: SPACING.sm,
        color: colors.text,
    },
    disclaimerText: {
        ...TYPOGRAPHY.body,
        lineHeight: 24,
        color: colors.text,
    },
    acceptanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    checkbox: {
        width: moderateScale(28),
        height: moderateScale(28),
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 2,
        borderColor: colors.primary,
        marginRight: SPACING.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxAccepted: {
        backgroundColor: colors.primary,
    },
    checkmark: {
        color: colors.white,
        fontSize: moderateScale(18),
        fontWeight: 'bold',
    },
    acceptanceText: {
        ...TYPOGRAPHY.body,
        flex: 1,
        fontWeight: '600',
        color: colors.text,
    },

    backButton: {
        position: 'absolute',
        top: SPACING.lg,
        left: SPACING.lg,
        zIndex: 10,
        padding: SPACING.sm,
    },
});
