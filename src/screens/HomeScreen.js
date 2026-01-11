import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    ScrollView,
    InteractionManager,
    BackHandler,
    ToastAndroid,
    Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    ZoomIn
} from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import { getUserSettings, getManualUV, addSessionLog, getDefaultPreferences } from '../utils/storage';
import { calculateSafeTime, getUVCategory } from '../utils/sunLogic';

const UV_SCALE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const getScaleColor = (uv) => {
    if (uv <= 2) return '#2E7D32'; // Strong Green
    if (uv <= 5) return '#F9A825'; // Vibrant Gold
    if (uv <= 7) return '#EF6C00'; // Deep Orange
    if (uv <= 10) return '#C62828'; // Strong Red
    return '#6A1B9A'; // Deep Violet
};

const RISK_LEVELS = [
    { range: '0-2', level: 'Low', color: '#2E7D32' },
    { range: '3-5', level: 'Moderate', color: '#F9A825' },
    { range: '6-7', level: 'High', color: '#EF6C00' },
    { range: '8-10', level: 'Very High', color: '#C62828' },
    { range: '11+', level: 'Extreme', color: '#6A1B9A' },
];

export default function HomeScreen() {
    // UV state
    const [uvIndex, setUvIndex] = useState(null);
    const [loading, setLoading] = useState(true);
    const [skinType, setSkinType] = useState(3);
    const [isCloudy, setIsCloudy] = useState(false);
    const [hasSunscreen, setHasSunscreen] = useState(false);
    const [safeMinutes, setSafeMinutes] = useState(30);

    // Timer state - TIMESTAMP-BASED for robustness
    const [timeLeft, setTimeLeft] = useState(1800); // seconds
    const [isActive, setIsActive] = useState(false);
    const [hasStarted, setHasStarted] = useState(false); // New state to track if timer was ever started
    const [endTimestamp, setEndTimestamp] = useState(null); // CRITICAL: stores when timer should end
    const intervalRef = useRef(null);

    // Animation values
    const pulseValue = useSharedValue(1);

    useEffect(() => {
        // Delay animation start to ensure Reanimated runtime is ready
        // Use InteractionManager to ensure native interactions are complete
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                try {
                    pulseValue.value = withRepeat(
                        withSequence(
                            withSpring(1.05, { damping: 2 }),
                            withSpring(1, { damping: 2 })
                        ),
                        -1, // infinite
                        true
                    );
                } catch (error) {
                    console.error('Animation initialization error:', error);
                }
            });
        });

        return () => task.cancel();
    }, []);

    const animatedUVStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseValue.value }],
    }));

    // Fetch UV Index from Open-Meteo API
    const fetchUVIndex = async (latitude, longitude) => {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=uv_index&timezone=auto`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.current && data.current.uv_index !== undefined) {
                return data.current.uv_index;
            }
            return null;
        } catch (error) {
            console.error('Error fetching UV data:', error);
            return null;
        }
    };

    // Double tap to exit logic
    useFocusEffect(
        useCallback(() => {
            let lastBackPress = 0;

            const onBackPress = () => {
                const now = Date.now();
                if (now - lastBackPress < 2000) {
                    BackHandler.exitApp();
                    return true;
                }

                lastBackPress = now;
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
                } else {
                    // For iOS or other platforms where ToastAndroid isn't available
                    // We typically typically rely on gesture swiping, but this is good fallback
                }
                return true;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => backHandler.remove();
        }, [])
    );

    // Initialize data
    useEffect(() => {
        initializeData();
    }, []);

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            initializeData();
        }, [])
    );

    // Recalculate safe time when conditions change
    useEffect(() => {
        if (uvIndex !== null && skinType !== null) {
            const newSafeTime = calculateSafeTime(uvIndex, skinType, isCloudy, hasSunscreen);
            setSafeMinutes(newSafeTime);

            // Only reset timeLeft if the timer hasn't started yet
            if (!hasStarted && !isActive) {
                setTimeLeft(newSafeTime * 60);
            }
        }
    }, [uvIndex, skinType, isCloudy, hasSunscreen, hasStarted]);

    // Timer countdown - TIMESTAMP-BASED APPROACH
    useEffect(() => {
        if (isActive && endTimestamp) {
            intervalRef.current = setInterval(() => {
                // Calculate remaining time from timestamp
                const remaining = Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000));
                setTimeLeft(remaining);

                if (remaining <= 0) {
                    handleTimerComplete();
                }
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isActive, endTimestamp]);

    const initializeData = async () => {
        try {
            const settings = await getUserSettings();
            setSkinType(settings.skinType || 3);

            // Load default sunscreen preference from setup (Step 2)
            const prefs = await getDefaultPreferences();
            const hasSPF = prefs.sunscreen === true;
            setHasSunscreen(hasSPF);
            console.log('✅ Sunscreen from setup:', hasSPF, 'Prefs:', prefs);

            // Check for manual UV override FIRST
            const manualUV = await getManualUV();
            console.log('Manual UV check:', manualUV);

            if (manualUV !== null && manualUV !== undefined) {
                console.log('✅ Using manual UV:', manualUV);
                setUvIndex(manualUV);
                setLoading(false);
                return; // Exit early - don't fetch from API
            }

            console.log('No manual UV set, checking location/API...');

            // Get location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Location Permission Required');
                setUvIndex(5); // Fallback
                setLoading(false);
                return;
            }

            // Get current location
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            // Fetch UV index
            const uv = await fetchUVIndex(
                currentLocation.coords.latitude,
                currentLocation.coords.longitude
            );

            setUvIndex(uv !== null ? uv : 5);
            setLoading(false);
        } catch (error) {
            console.error('Error initializing data:', error);
            setUvIndex(5);
            setLoading(false);
        }
    };

    const handleTimerComplete = async () => {
        setIsActive(false);

        // Trigger haptic feedback
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (error) {
            console.error('Haptics error:', error);
        }

        // Send notification
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '⏰ Sun Exposure Complete!',
                    body: 'Your safe sun time is up. Consider seeking shade.',
                    sound: true,
                },
                trigger: null,
            });
        } catch (error) {
            console.error('Notification error:', error);
        }

        // Log the session
        console.log('⏰ Timer complete! Logging session:', {
            uvIndex,
            duration: safeMinutes,
            skinType,
            date: new Date().toISOString()
        });

        await addSessionLog({
            uvIndex,
            duration: safeMinutes,
            skinType,
            date: new Date().toISOString(),
        });

        console.log('✅ Session logged successfully! Check Progress tab.');

        Alert.alert(
            "Time's Up!",
            "Your safe sun exposure time is complete.\n\n✅ Session logged to Progress tab!"
        );
    };

    const startTimer = () => {
        // Set end timestamp based on current timeLeft
        const endTime = Date.now() + (timeLeft * 1000);
        setEndTimestamp(endTime);
        setIsActive(true);
        setHasStarted(true);
    };

    const stopTimer = () => {
        setIsActive(false);
        setEndTimestamp(null);
    };

    const resetTimer = () => {
        setIsActive(false);
        setEndTimestamp(null);
        setHasStarted(false); // Reset this so it can be auto-updated again
        setTimeLeft(safeMinutes * 60);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Fetching UV data...</Text>
            </SafeAreaView>
        );
    }

    const uvCategory = getUVCategory(uvIndex);
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const progress = (timeLeft / (safeMinutes * 60)) * 100;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>Suntime</Text>
                </View>

                {/* FEATURE 1: UV INDEX COLOR SCALE */}
                <View style={styles.scaleContainer}>
                    <Text style={styles.scaleLabel}>UV Spectrum</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.uvScaleScroll}
                        style={{ flexGrow: 0 }}
                    >
                        <View style={styles.uvScale}>
                            {UV_SCALE_NUMBERS.map((num) => {
                                const isSelected = uvIndex !== null && (num === 11 ? uvIndex >= 11 : Math.round(uvIndex) === num);
                                return (
                                    <View
                                        key={num}
                                        style={[
                                            styles.scaleItem,
                                            { backgroundColor: getScaleColor(num) },
                                            isSelected && styles.scaleItemActive
                                        ]}
                                    >
                                        <Text style={[styles.scaleText, isSelected && styles.scaleTextActive]}>
                                            {num}{num === 11 ? '+' : ''}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>

                {/* UV Widget */}
                <Animated.View
                    entering={FadeInDown}
                    style={[styles.uvWidget, { borderColor: uvCategory.color }]}
                >
                    <Animated.View style={[styles.uvInfo, animatedUVStyle]}>
                        <Text style={styles.uvLabel}>UV Index</Text>
                        <Text style={[styles.uvValue, { color: uvCategory.color }]}>
                            {uvIndex.toFixed(1)}
                        </Text>
                        <Text style={[styles.uvLevel, { color: uvCategory.color }]}>
                            {uvCategory.level}
                        </Text>
                    </Animated.View>
                </Animated.View>

                {/* Circular Countdown Timer */}
                <Animated.View
                    entering={ZoomIn}
                    style={styles.timerContainer}
                >
                    <View style={styles.circularTimer}>
                        <View
                            style={[
                                styles.progressRing,
                                {
                                    borderColor: progress > 20 ? COLORS.success : COLORS.danger,
                                },
                            ]}
                        />
                        <View style={styles.timerContent}>
                            <Text style={styles.timerTime}>{formattedTime}</Text>
                            <Text style={styles.timerLabel}>Safe Time</Text>
                        </View>
                    </View>

                    {/* Timer Controls */}
                    <View style={styles.controlsContainer}>
                        {!isActive ? (
                            <TouchableOpacity style={styles.startButton} onPress={startTimer}>
                                <Text style={styles.buttonText}>Start Timer</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.activeControls}>
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={stopTimer}
                                >
                                    <Text style={styles.buttonText}>Pause</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.controlButton, styles.resetButton]}
                                    onPress={resetTimer}
                                >
                                    <Text style={styles.buttonText}>Reset</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* Environment Toggles */}
                <View style={styles.togglesContainer}>
                    <TouchableOpacity
                        style={[styles.toggle, isCloudy && styles.toggleActive]}
                        onPress={() => setIsCloudy(!isCloudy)}
                    >
                        <Text style={[styles.toggleText, isCloudy && styles.toggleTextActive]}>
                            Cloudy
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toggle, hasSunscreen && styles.toggleActive]}
                        onPress={() => setHasSunscreen(!hasSunscreen)}
                    >
                        <Text style={[styles.toggleText, hasSunscreen && styles.toggleTextActive]}>
                            Sunscreen
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* High UV Warning */}
                {uvIndex >= 10 && (
                    <View style={styles.warningBanner}>
                        <View style={styles.warningTextContainer}>
                            <Text style={styles.warningTitle}>Extreme UV Alert!</Text>
                            <Text style={styles.warningText}>
                                UV Index is dangerously high. Limit sun exposure.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Safe Time Display */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        Your safe sun exposure time: <Text style={styles.infoHighlight}>{safeMinutes} minutes</Text>
                    </Text>
                </View>

                {/* FEATURE 2: RISK LEVEL LEGEND */}
                <View style={styles.riskLegendCard}>
                    <Text style={styles.riskLegendTitle}>Risk Level Guide</Text>
                    <View style={styles.riskList}>
                        {RISK_LEVELS.map((item, index) => (
                            <View key={index} style={styles.riskRow}>
                                <View style={styles.riskRangeContainer}>
                                    <View style={[styles.riskDot, { backgroundColor: item.color }]} />
                                    <Text style={styles.riskRange}>{item.range}</Text>
                                </View>
                                <Text style={[styles.riskLevel, { color: item.color }]}>{item.level}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>Estimates only. Not medical advice.</Text>
                </View>
            </ScrollView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: moderateScale(100),
    },
    loadingText: {
        ...TYPOGRAPHY.body,
        marginTop: SPACING.md,
        textAlign: 'center',
        color: COLORS.textSecondary,
    },
    header: {
        marginBottom: SPACING.xl,
        alignItems: 'center',
        paddingTop: SPACING.md,
    },
    logo: {
        ...TYPOGRAPHY.title,
        color: COLORS.primary,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    uvWidget: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.xl,
        alignItems: 'center',
        borderWidth: 0,
        ...SHADOWS.medium,
    },
    uvInfo: {
        alignItems: 'center',
    },
    uvLabel: {
        ...TYPOGRAPHY.caption,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.xs,
    },
    uvValue: {
        fontSize: moderateScale(56),
        fontWeight: 'bold',
        marginVertical: SPACING.sm,
    },
    uvLevel: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        marginTop: SPACING.xs,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        ...SHADOWS.medium,
    },
    circularTimer: {
        width: moderateScale(200),
        height: moderateScale(200),
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: SPACING.lg,
    },
    progressRing: {
        position: 'absolute',
        width: moderateScale(200),
        height: moderateScale(200),
        borderRadius: moderateScale(100),
        borderWidth: moderateScale(10),
    },
    timerContent: {
        alignItems: 'center',
    },
    timerTime: {
        fontSize: moderateScale(48),
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: -1,
    },
    timerLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    controlsContainer: {
        marginTop: SPACING.md,
        width: '100%',
        maxWidth: 400, // Constrain max width for tablets
        alignSelf: 'center',
    },
    startButton: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, // Reduced padding
        alignItems: 'center',
        ...SHADOWS.button,
    },
    activeControls: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    controlButton: {
        flex: 1,
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, // Reduced padding
        alignItems: 'center',
        ...SHADOWS.button,
    },
    resetButton: {
        backgroundColor: COLORS.textSecondary,
        ...SHADOWS.small,
    },
    buttonText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.white,
        fontWeight: '600',
        fontSize: moderateScale(16),
    },
    togglesContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    toggle: {
        flex: 1,
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md + 2,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    toggleActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    toggleText: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.text,
        fontSize: moderateScale(14),
    },
    toggleTextActive: {
        color: COLORS.white,
    },
    infoCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.primary,
        ...SHADOWS.small,
        marginBottom: SPACING.md,
    },
    infoText: {
        ...TYPOGRAPHY.body,
        lineHeight: 24,
    },
    infoHighlight: {
        fontWeight: 'bold',
        color: COLORS.primary,
        fontSize: moderateScale(18),
    },
    warningBanner: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    warningIcon: {
        fontSize: moderateScale(36),
        marginRight: SPACING.md,
    },
    warningTextContainer: {
        flex: 1,
    },
    warningTitle: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.text,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
    },
    warningText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    disclaimer: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.lg,
        padding: SPACING.md,
        alignItems: 'center',
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.md,
    },
    disclaimerText: {
        ...TYPOGRAPHY.caption,
        fontStyle: 'italic',
        color: COLORS.textSecondary,
    },
    // New Styles
    scaleContainer: {
        marginBottom: SPACING.lg,
        alignItems: 'center',
    },
    scaleLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    uvScale: {
        flexDirection: 'row',
        gap: moderateScale(8),
        paddingHorizontal: SPACING.xs,
        paddingVertical: SPACING.xs, // Add padding for shadow clipping
    },
    uvScaleScroll: {
        paddingRight: SPACING.lg, // Extra padding at end
    },
    scaleItem: {
        width: moderateScale(28), // Slightly larger
        height: moderateScale(28),
        borderRadius: moderateScale(14),
        justifyContent: 'center',
        alignItems: 'center',
        // No opacity, solid colors
    },
    scaleItemActive: {
        transform: [{ scale: 1.2 }], // Scale 1.2x
        borderWidth: 3, // Thick border
        borderColor: '#333333', // Dark Grey/Black border
        ...SHADOWS.medium,
        zIndex: 10,
    },
    scaleText: {
        fontSize: moderateScale(12),
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    scaleTextActive: {
        fontSize: moderateScale(13),
    },
    riskLegendCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        ...SHADOWS.small,
    },
    riskLegendTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        color: COLORS.text,
    },
    riskList: {
        gap: SPACING.sm,
    },
    riskRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    riskRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    riskDot: {
        width: moderateScale(12),
        height: moderateScale(12),
        borderRadius: moderateScale(6),
    },
    riskRange: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
        fontWeight: '600',
        width: moderateScale(50),
    },
    riskLevel: {
        ...TYPOGRAPHY.body,
        fontWeight: 'bold',
    },
});
