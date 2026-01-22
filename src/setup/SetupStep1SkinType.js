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
import { User, Camera, Hand } from 'lucide-react-native';
import { setOnboarded } from '../utils/storage';
import { getSkinTypeDescription } from '../utils/sunLogic';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { saveUserToFirestore } from '../services/firestore';
import StandardButton from '../components/common/StandardButton';

const SKIN_TYPES = [1, 2, 3, 4, 5, 6];

const SKIN_TYPE_COLORS = {
    1: '#FFE4E1',
    2: '#FFD7BE',
    3: '#F4C2A0',
    4: '#D2996B',
    5: '#A67C52',
    6: '#5D4037',
};

export default function SetupStep1SkinType({ navigation }) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const [selectedType, setSelectedType] = useState(null);
    const [selectionMode, setSelectionMode] = useState(null); // 'camera' or 'manual'

    const handleCameraScan = () => {
        navigation.navigate('SkinScanner', {
            onSelectSkinType: async (type) => {
                // Camera scan completed - automatically save and proceed
                try {
                    console.log('🎯 Camera detected skin type:', type);

                    // Save skin type to local storage
                    await setOnboarded(type);

                    // Also save to Firestore if user is logged in
                    if (user) {
                        await saveUserToFirestore(user.uid, { skinType: type });
                    }

                    // Navigate directly to next setup step
                    navigation.navigate('SetupStep2');
                } catch (error) {
                    console.error('Error saving skin type:', error);
                    Alert.alert('Error', 'Error saving your data. Please try again.');
                    // Fallback to manual selection on error
                    setSelectedType(type);
                    setSelectionMode('camera');
                }
            },
        });
    };

    const handleManualSelect = () => {
        setSelectionMode('manual');
    };

    const handleContinue = async () => {
        if (selectedType === null) {
            Alert.alert('Selection Required', 'Please select your skin type to continue.');
            return;
        }

        try {
            // Save skin type to local storage
            await setOnboarded(selectedType);

            // Also save to Firestore if user is logged in
            if (user) {
                await saveUserToFirestore(user.uid, { skinType: selectedType });
            }

            // Navigate to next setup step
            navigation.navigate('SetupStep2');
        } catch (error) {
            console.error('Error saving skin type:', error);
            Alert.alert('Error', 'Error saving your data. Please try again.');
        }
    };

    // Initial selection mode view
    if (selectionMode === null) {
        return (
            <SafeAreaView style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Progress Indicator */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: '25%' }]} />
                        </View>
                        <Text style={styles.progressText}>Step 1 of 4</Text>
                    </View>

                    {/* Header */}
                    <Animated.View entering={FadeInDown} style={styles.header}>
                        <User color={colors.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
                        <Text style={styles.title}>Determine Your Skin Type</Text>
                        <Text style={styles.subtitle}>
                            Choose how you'd like to identify your skin type based on the Fitzpatrick Scale.
                        </Text>
                    </Animated.View>

                    {/* Selection Options */}
                    <View style={styles.optionsContainer}>
                        {/* Camera Scan Option */}
                        <Animated.View entering={FadeInDown.delay(100)}>
                            <TouchableOpacity
                                style={styles.optionCard}
                                onPress={handleCameraScan}
                            >
                                <View style={styles.optionIconContainer}>
                                    <Camera color={colors.primary} size={moderateScale(40)} />
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.optionTitle}>📷 Scan with Camera</Text>
                                    <Text style={styles.optionDescription}>
                                        Take a photo and we'll analyze your skin tone automatically
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Manual Selection Option */}
                        <Animated.View entering={FadeInDown.delay(200)}>
                            <TouchableOpacity
                                style={styles.optionCard}
                                onPress={handleManualSelect}
                            >
                                <View style={styles.optionIconContainer}>
                                    <Hand color={colors.primary} size={moderateScale(40)} />
                                </View>
                                <View style={styles.optionTextContainer}>
                                    <Text style={styles.optionTitle}>✋ Select Manually</Text>
                                    <Text style={styles.optionDescription}>
                                        Choose your skin type from the Fitzpatrick scale options
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>ℹ️ About the Fitzpatrick Scale</Text>
                        <Text style={styles.infoText}>
                            The Fitzpatrick scale classifies skin types I-VI based on how your skin reacts to sun exposure. This helps us calculate safe sun exposure times for you.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Manual selection view
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '25%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 1 of 4</Text>
                </View>

                {/* Header */}
                <Animated.View
                    entering={FadeInDown}
                    style={styles.header}
                >
                    <User color={colors.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
                    <Text style={styles.title}>Select Your Skin Type</Text>
                    <Text style={styles.subtitle}>
                        {selectionMode === 'camera'
                            ? 'We detected your skin type. Confirm or adjust below:'
                            : 'Based on the Fitzpatrick Scale. This helps us calculate safe sun exposure times.'}
                    </Text>
                </Animated.View>

                {/* Back to options */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        setSelectionMode(null);
                        setSelectedType(null);
                    }}
                >
                    <Text style={styles.backButtonText}>← Choose Different Method</Text>
                </TouchableOpacity>

                {/* Skin Types */}
                <View style={styles.typesContainer}>
                    {SKIN_TYPES.map((type, index) => (
                        <Animated.View
                            entering={FadeInDown.delay(index * 50)}
                            key={type}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.typeCard,
                                    selectedType === type && styles.typeCardSelected,
                                ]}
                                onPress={() => setSelectedType(type)}
                            >
                                <View style={styles.typeHeader}>
                                    <View
                                        style={[
                                            styles.typeIndicator,
                                            { backgroundColor: SKIN_TYPE_COLORS[type] }
                                        ]}
                                    />
                                    <Text style={styles.typeTitle}>
                                        {getSkinTypeDescription(type)}
                                    </Text>
                                    {selectedType === type && (
                                        <Text style={styles.checkmark}>✓</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                {/* Continue Button */}
                <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl }}>
                    <StandardButton
                        title="Continue"
                        onPress={handleContinue}
                        disabled={selectedType === null}
                    />
                </View>
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
    // Options styles
    optionsContainer: {
        marginBottom: SPACING.xl,
    },
    optionCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    optionIconContainer: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        backgroundColor: colors.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        fontWeight: '600',
        marginBottom: 4,
    },
    optionDescription: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    infoCard: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
    },
    infoTitle: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    infoText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    // Manual selection styles
    backButton: {
        marginBottom: SPACING.md,
    },
    backButtonText: {
        color: colors.primary,
        fontWeight: '600',
    },
    typesContainer: {
        marginBottom: SPACING.xl,
    },
    typeCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 2,
        borderColor: colors.border,
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    typeCardSelected: {
        borderColor: colors.primary,
        borderWidth: 3,
        ...SHADOWS.medium,
    },
    typeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeIndicator: {
        width: moderateScale(28),
        height: moderateScale(28),
        borderRadius: BORDER_RADIUS.full,
        marginRight: SPACING.md,
        borderWidth: 2,
        borderColor: colors.border,
    },
    typeTitle: {
        ...TYPOGRAPHY.subheading,
        flex: 1,
        fontWeight: '600',
        color: colors.text,
    },
    checkmark: {
        fontSize: moderateScale(28),
        color: colors.primary,
    },
});
