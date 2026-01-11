import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert,
    Platform
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import { Sun } from 'lucide-react-native';
import { setOnboarded } from '../utils/storage';
import { getSkinTypeDescription } from '../utils/sunLogic';

const SKIN_TYPES = [1, 2, 3, 4, 5, 6];

export default function OnboardingScreen({ navigation, route }) {
    const [selectedType, setSelectedType] = useState(null);

    const handleContinue = async () => {
        if (selectedType === null) {
            Alert.alert('Error', 'Please select your skin type');
            return;
        }

        try {
            await setOnboarded(selectedType);

            // Check if this is a modal (from Settings) or initial onboarding
            const isModal = navigation.getState().routes.some(r => r.name === 'ChangeSkinType');

            if (isModal) {
                // Just go back to Settings
                navigation.goBack();
            } else {
                // Return to previous screen or home if possible
                // Since this is initial onboarding, we should probably reset navigation
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'SetupStep1' }],
                });
            }
        } catch (error) {
            console.error('Error saving onboarding data:', error);
            Alert.alert('Error', 'Error saving your data. Please try again.');
        }
    };

    const getSkinColor = (type) => {
        const colors = {
            1: '#FFE0BD',
            2: '#F1C27D',
            3: '#C68642',
            4: '#8D5524',
            5: '#6B4423',
            6: '#3D2817',
        };
        return colors[type] || '#9E9E9E';
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Animated.View
                    style={styles.header}
                >
                    <Sun color={COLORS.primary} size={moderateScale(72)} style={{ marginBottom: SPACING.lg }} />
                    <Text style={styles.title}>Welcome to Suntime</Text>
                    <Text style={styles.subtitle}>
                        Calculate safe sun exposure to maximize Vitamin D without burning
                    </Text>
                </Animated.View>

                <Animated.View
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>Select Your Skin Type</Text>
                    <Text style={styles.sectionSubtitle}>Based on the Fitzpatrick Scale</Text>

                    {SKIN_TYPES.map((type, index) => (
                        <Animated.View
                            key={type}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.skinTypeCard,
                                    selectedType === type && styles.skinTypeCardSelected,
                                ]}
                                onPress={() => setSelectedType(type)}
                            >
                                <View style={styles.skinTypeHeader}>
                                    <View
                                        style={[
                                            styles.skinTypeIndicator,
                                            { backgroundColor: getSkinColor(type) },
                                        ]}
                                    />
                                    <Text style={styles.skinTypeTitle}>Type {type}</Text>
                                    {selectedType === type && (
                                        <Text style={styles.checkmark}>✓</Text>
                                    )}
                                </View>
                                <Text style={styles.skinTypeDescription}>
                                    {getSkinTypeDescription(type).split(' - ')[1]}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </Animated.View>

                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        selectedType === null && styles.continueButtonDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={selectedType === null}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
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
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
        paddingTop: SPACING.lg,
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
        lineHeight: 24,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        ...TYPOGRAPHY.heading,
        marginBottom: SPACING.xs,
    },
    sectionSubtitle: {
        ...TYPOGRAPHY.caption,
        marginBottom: SPACING.lg,
        color: COLORS.textSecondary,
    },
    skinTypeCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    skinTypeCardSelected: {
        borderColor: COLORS.primary,
        borderWidth: 3,
        backgroundColor: COLORS.backgroundLight,
        ...SHADOWS.medium,
    },
    skinTypeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    skinTypeIndicator: {
        width: moderateScale(28),
        height: moderateScale(28),
        borderRadius: BORDER_RADIUS.full,
        marginRight: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    skinTypeTitle: {
        ...TYPOGRAPHY.subheading,
        flex: 1,
        fontWeight: '600',
    },
    checkmark: {
        fontSize: 28,
        color: COLORS.primary,
    },
    skinTypeDescription: {
        ...TYPOGRAPHY.caption,
        marginLeft: 40,
        lineHeight: 20,
        color: COLORS.textSecondary,
    },
    continueButton: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md + 2,
        alignItems: 'center',
        marginTop: SPACING.xl,
        ...SHADOWS.button,
    },
    continueButtonDisabled: {
        backgroundColor: COLORS.lightGray,
        ...SHADOWS.small,
    },
    continueButtonText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.white,
        fontWeight: '600',
    },
});
