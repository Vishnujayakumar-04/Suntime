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
import Animated, { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import { Sun } from 'lucide-react-native';
import { setOnboarded, getUserSettings } from '../utils/storage';
import { getSkinTypeDescription } from '../utils/sunLogic';

import { saveUserToFirestore } from '../services/firestore';
import { auth } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';

const SKIN_TYPES = [1, 2, 3, 4, 5, 6];

export default function OnboardingScreen({ navigation, route }) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const [selectedType, setSelectedType] = useState(null);
    const [loading, setLoading] = useState(false);

    // Initial load to pre-select skin type if editing
    React.useEffect(() => {
        const loadCurrent = async () => {
            const settings = await getUserSettings();
            if (settings && settings.skinType) {
                setSelectedType(settings.skinType);
            }
        };
        loadCurrent();
    }, []);

    const handleContinue = async () => {
        if (selectedType === null) {
            Alert.alert('Error', 'Please select your skin type');
            return;
        }

        try {
            setLoading(true);
            await setOnboarded(selectedType);

            if (auth.currentUser) {
                await saveUserToFirestore(auth.currentUser.uid, { skinType: selectedType });
            }

            // Check if this is a modal (from Settings)
            const isModal = route.name === 'ChangeSkinType';

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
            setLoading(false);
        }
    };

    const getSkinColor = (type) => {
        const skinColors = {
            1: '#FFE0BD',
            2: '#F1C27D',
            3: '#C68642',
            4: '#8D5524',
            5: '#6B4423',
            6: '#3D2817',
        };
        return skinColors[type] || '#9E9E9E';
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    entering={FadeInDown.delay(200)}
                    style={styles.header}
                >
                    <Sun color={colors.primary} size={moderateScale(72)} style={{ marginBottom: SPACING.lg }} />
                    <Text style={styles.title}>Welcome to Suntime</Text>
                    <Text style={styles.subtitle}>
                        Calculate safe sun exposure to maximize Vitamin D without burning
                    </Text>
                </Animated.View>

                <Animated.View
                    entering={FadeInDown.delay(400)}
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>Select Your Skin Type</Text>
                    <Text style={styles.sectionSubtitle}>Based on the Fitzpatrick Scale</Text>

                    {SKIN_TYPES.map((type, index) => (
                        <View
                            key={type}
                            style={{ marginBottom: 10 }}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.skinTypeCard,
                                    selectedType === type && styles.skinTypeCardSelected,
                                ]}
                                onPress={() => setSelectedType(type)}
                                activeOpacity={0.7}
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
                        </View>
                    ))}
                </Animated.View>

                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        (selectedType === null || loading) && styles.continueButtonDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={selectedType === null || loading}
                >
                    <Text style={styles.continueButtonText}>
                        {loading ? 'Saving...' : 'Continue'}
                    </Text>
                </TouchableOpacity>
                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl * 2, // Added extra padding for scrolling
        flexGrow: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.lg, // Reduced from xxl
        paddingTop: SPACING.md,   // Reduced from lg
    },
    title: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
        marginBottom: SPACING.sm,
        color: colors.text, // Dynamic color
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        textAlign: 'center',
        color: colors.textSecondary,
        paddingHorizontal: SPACING.lg,
        lineHeight: 24,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        ...TYPOGRAPHY.heading,
        marginBottom: SPACING.xs,
        color: colors.text, // Dynamic color
    },
    sectionSubtitle: {
        ...TYPOGRAPHY.caption,
        marginBottom: SPACING.lg,
        color: colors.textSecondary,
    },
    skinTypeCard: {
        backgroundColor: colors.cardBackground, // Dynamic color
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, // Reduced from lg
        marginBottom: 8,     // Reduced from md (which is ~16)
        borderWidth: 2,
        borderColor: colors.border, // Dynamic color
        ...SHADOWS.small,
    },
    skinTypeCardSelected: {
        borderColor: colors.primary,
        borderWidth: 3,
        backgroundColor: colors.backgroundLight, // Dynamic color
        ...SHADOWS.medium,
    },
    skinTypeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    skinTypeIndicator: {
        width: moderateScale(28), // Ensure visibility
        height: moderateScale(28),
        borderRadius: BORDER_RADIUS.full,
        marginRight: SPACING.md,
        borderWidth: 2,
        borderColor: colors.border,
    },
    skinTypeTitle: {
        ...TYPOGRAPHY.subheading,
        flex: 1,
        fontWeight: '600',
        color: colors.text, // Dynamic color
    },
    checkmark: {
        fontSize: 28,
        color: colors.primary,
    },
    skinTypeDescription: {
        ...TYPOGRAPHY.caption,
        marginLeft: 44, // Adjusted for alignment
        lineHeight: 20,
        color: colors.textSecondary,
    },
    continueButton: {
        backgroundColor: colors.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md + 4, // Bigger touch area
        alignItems: 'center',
        marginTop: SPACING.md, // Reduced from xl
        marginBottom: SPACING.md, // Reduced from xl
        ...SHADOWS.button,
    },
    continueButtonDisabled: {
        backgroundColor: colors.disabled || '#A0A0A0',
        opacity: 0.7,
        ...SHADOWS.small,
    },
    continueButtonText: {
        ...TYPOGRAPHY.subheading,
        color: colors.white,
        fontWeight: 'bold',
        fontSize: moderateScale(18),
    },
});
