import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Platform
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../../constants/theme';
import { AlertTriangle, Info, ShieldAlert, Heart, Activity } from 'lucide-react-native';
import { completeSetup, saveDisclaimerAcceptance } from '../../utils/storage';

export default function SetupStep4Disclaimer({ navigation }) {
    const [accepted, setAccepted] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    const handleComplete = async () => {
        if (!accepted) {
            Alert.alert('Required', 'Please check the box to accept the disclaimer');
            return;
        }

        setIsCompleting(true);
        try {
            console.log('Completing setup...');
            // Save disclaimer acceptance
            await saveDisclaimerAcceptance();

            // Mark setup as complete
            await completeSetup();
            console.log('Setup marked as complete!');

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
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '100%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 4 of 4</Text>
                </View>

                {/* Header */}
                <Animated.View
                    entering={FadeInDown}
                    style={styles.header}
                >
                    <AlertTriangle color={COLORS.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
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
                            <Info color={COLORS.primary} size={20} style={{ marginRight: SPACING.sm }} />
                            <Text style={styles.disclaimerHeading}>Estimates Only</Text>
                        </View>
                        <Text style={styles.disclaimerText}>
                            This app provides general guidance and estimates for safe sun exposure.
                            It is NOT a substitute for professional medical advice, diagnosis, or treatment.
                        </Text>
                    </View>

                    <View style={styles.disclaimerSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                            <ShieldAlert color={COLORS.primary} size={20} style={{ marginRight: SPACING.sm }} />
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
                            <Activity color={COLORS.primary} size={20} style={{ marginRight: SPACING.sm }} />
                            <Text style={styles.disclaimerHeading}>Never Burn</Text>
                        </View>
                        <Text style={styles.disclaimerText}>
                            The goal is SAFE sun exposure for Vitamin D, not tanning or burning.
                            Stop immediately if your skin shows any signs of burning.
                        </Text>
                    </View>

                    <View style={styles.disclaimerSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
                            <Heart color={COLORS.primary} size={20} style={{ marginRight: SPACING.sm }} />
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
                <TouchableOpacity
                    style={[styles.completeButton, (!accepted || isCompleting) && styles.buttonDisabled]}
                    onPress={handleComplete}
                    disabled={!accepted || isCompleting}
                >
                    <Text style={styles.completeButtonText}>
                        {isCompleting ? 'Completing Setup...' : 'Complete Setup'}
                    </Text>
                </TouchableOpacity>
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
        paddingBottom: SPACING.xxl,
    },
    progressContainer: {
        marginBottom: SPACING.xl,
    },
    progressBar: {
        height: moderateScale(6),
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    progressText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
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
    },
    disclaimerCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.xl,
        borderWidth: 2,
        borderColor: COLORS.border,
        ...SHADOWS.medium,
    },
    disclaimerTitle: {
        ...TYPOGRAPHY.heading,
        marginBottom: SPACING.lg,
        textAlign: 'center',
        color: COLORS.primary,
    },
    disclaimerSection: {
        marginBottom: SPACING.lg,
    },
    disclaimerHeading: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
        marginBottom: SPACING.sm,
    },
    disclaimerText: {
        ...TYPOGRAPHY.body,
        lineHeight: 24,
        color: COLORS.text,
    },
    acceptanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
    },
    checkbox: {
        width: moderateScale(28),
        height: moderateScale(28),
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 2,
        borderColor: COLORS.primary,
        marginRight: SPACING.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxAccepted: {
        backgroundColor: COLORS.primary,
    },
    checkmark: {
        color: COLORS.white,
        fontSize: moderateScale(18),
        fontWeight: 'bold',
    },
    acceptanceText: {
        ...TYPOGRAPHY.body,
        flex: 1,
        fontWeight: '600',
    },
    completeButton: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md + 2,
        alignItems: 'center',
        ...SHADOWS.button,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    completeButtonText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.white,
        fontWeight: '600',
        fontSize: moderateScale(18),
    },
});
