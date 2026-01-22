import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    InteractionManager,
    BackHandler,
    ToastAndroid,
    Platform,
    AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
    scheduleImmediateNotification,
    scheduleNotificationAtDate,
    scheduleDailyNotification,
    cancelNotification,
    getScheduledNotifications,
    requestNotificationPermissions // New import
} from '../utils/notifications';
import Animated, {
    FadeInDown,
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS, COLORS } from '../constants/theme';

import { saveSessionToFirestore, checkDailySessionLimit, updateDailySession, fetchSessions } from '../services/firestore';
import { auth } from '../config/firebase';
import {
    getUserSettings,
    getManualUV,
    getDefaultPreferences,
    getActiveTimer,
    setActiveTimer,
    clearActiveTimer
} from '../utils/storage';
import { calculateSafeTime, getUVCategory } from '../utils/sunLogic';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StandardButton from '../components/common/StandardButton';
import SunTimer from '../components/SunTimer';
import SessionCompleteOverlay from '../components/SessionCompleteOverlay';
import WeatherCard from '../components/WeatherCard';
import WhatsNewModal from '../components/WhatsNewModal';

const APP_VERSION = '1.0.0'; // Increment this to show modal again

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

export default function HomeScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles(colors), [colors]);

    // UV & Weather state
    const [uvIndex, setUvIndex] = useState(null);
    const [weatherData, setWeatherData] = useState(null); // { city, temp, condition }
    const [loading, setLoading] = useState(true);

    // Timer state
    const [skinType, setSkinType] = useState(3);
    const [isCloudy, setIsCloudy] = useState(false);
    const [hasSunscreen, setHasSunscreen] = useState(false);
    const [safeMinutes, setSafeMinutes] = useState(30);
    const [isManualData, setIsManualData] = useState(false);

    // Modal state
    const [showWhatsNew, setShowWhatsNew] = useState(false);

    // Timer logic - TIMESTAMP-BASED
    const [timeLeft, setTimeLeft] = useState(1800);
    const [isActive, setIsActive] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [isSessionComplete, setIsSessionComplete] = useState(false);
    const [endTimestamp, setEndTimestamp] = useState(null);
    const intervalRef = useRef(null);
    const notificationIdRef = useRef(null);

    // Daily Limit State
    const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);

    // Check Daily Limit
    useFocusEffect(
        useCallback(() => {
            const checkLimit = async () => {
                if (auth.currentUser) {
                    const { allowed } = await checkDailySessionLimit(auth.currentUser.uid);
                    setIsDailyLimitReached(!allowed);
                }
            };
            checkLimit();
        }, [])
    );

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

    // Disabled pulse animation as per user feedback ("jumping")
    const animatedUVStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 }],
    }));

    // Check for app updates
    useEffect(() => {
        const checkVersion = async () => {
            try {
                const lastVersion = await AsyncStorage.getItem('last_seen_version');
                if (lastVersion !== APP_VERSION) {
                    setShowWhatsNew(true);
                    await AsyncStorage.setItem('last_seen_version', APP_VERSION);
                }
            } catch (e) {
                console.error('Version check error:', e);
            }
        };
        checkVersion();
    }, []);

    const getWeatherCondition = (code) => {
        if (code === 0) return 'Clear Sky';
        if (code >= 1 && code <= 3) return 'Partly Cloudy';
        if (code >= 45 && code <= 48) return 'Foggy';
        if (code >= 51 && code <= 67) return 'Rainy';
        if (code >= 71 && code <= 77) return 'Snowy';
        if (code >= 80 && code <= 82) return 'Rain Showers';
        if (code >= 95) return 'Thunderstorm';
        return 'Cloudy'; // Default
    };

    // Fetch UV + Weather + City
    const fetchWeatherAndUV = async (latitude, longitude) => {
        try {
            // 1. Open-Meteo for UV and Weather
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=uv_index,temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`;
            const response = await fetch(url);
            const data = await response.json();

            // 2. Reverse Geocoding for City using Expo Location
            let cityName = 'Unknown Location';
            try {
                const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (addresses && addresses.length > 0) {
                    cityName = addresses[0].city || addresses[0].subregion || addresses[0].region || 'Unknown Location';
                }
            } catch (geoError) {
                console.warn('Geocoding failed:', geoError);
            }

            if (data.current) {
                return {
                    uv: data.current.uv_index,
                    temp: data.current.temperature_2m,
                    code: data.current.weather_code,
                    windSpeed: data.current.wind_speed_10m,
                    humidity: data.current.relative_humidity_2m,
                    city: cityName
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching weather data:', error);
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

    // AppState listener for background/foreground timer sync
    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
                // App came to foreground - recalculate timer from stored timestamp
                console.log('📱 App became active - syncing timer state...');

                const activeTimer = await getActiveTimer();
                if (activeTimer && activeTimer.endTimestamp) {
                    const now = Date.now();
                    const remaining = Math.max(0, Math.ceil((activeTimer.endTimestamp - now) / 1000));

                    if (remaining > 0) {
                        // Timer is still running
                        console.log(`⏰ Timer resuming with ${remaining}s remaining`);
                        setEndTimestamp(activeTimer.endTimestamp);
                        setTimeLeft(remaining);
                        notificationIdRef.current = activeTimer.notificationId;
                        setHasStarted(true);
                        setIsActive(true);
                    } else {
                        // Timer completed while in background
                        console.log('⏰ Timer completed in background');
                        await clearActiveTimer();
                        if (!hasStarted) {
                            // Only trigger completion if we haven't already
                            handleTimerComplete();
                        }
                    }
                }
            }
        });

        return () => {
            appStateSubscription.remove();
        };
    }, [hasStarted]);

    // Schedule Daily Reminder (Smart Logic)
    const updateDailyNotification = useCallback(async () => {
        try {
            if (!auth.currentUser) return;

            // Get logs for TODAY
            const logs = await fetchSessions(auth.currentUser.uid);
            const today = new Date().toISOString().split('T')[0];
            const hasSessionToday = logs.some(log => log.date.startsWith(today));

            // Cancel existing daily notification
            const scheduled = await getScheduledNotifications();
            const dailyId = scheduled.find(n => n.content?.title?.includes('Daily Sun Goal'))?.identifier;

            if (dailyId) {
                await cancelNotification(dailyId);
            }

            // Determine message based on state
            const content = hasSessionToday ? {
                title: 'Daily Sun Goal 🌞',
                body: 'Great job meeting your sunlight goal today!',
            } : {
                title: 'Daily Sun Goal 🌙',
                body: "You missed today's goal. Let's try again tomorrow!",
            };

            // Schedule for 6 PM
            await scheduleDailyNotification(
                content.title,
                content.body,
                18,
                0
            );
            console.log('[DEBUG] Updated Daily Notification Context:', content.body);
        } catch (e) {
            console.log('Schedule error', e);
        }
    }, []);

    useEffect(() => {
        updateDailyNotification();
    }, [updateDailyNotification]);

    // Initialize data
    useEffect(() => {
        initializeData();

        // Restore persisted timer state (Background Timer Support)
        const restoreTimer = async () => {
            const activeTimer = await getActiveTimer();
            if (activeTimer) {
                if (activeTimer.endTimestamp > Date.now()) {
                    console.log('Resuming persistent timer...');
                    setEndTimestamp(activeTimer.endTimestamp);
                    notificationIdRef.current = activeTimer.notificationId;
                    setHasStarted(true);
                    setIsActive(true);
                } else {
                    // Timer finished while app was closed/backgrounded
                    console.log('Timer finished in background');
                    await clearActiveTimer();
                    // We can trigger the complete handler, but give a small delay 
                    // to ensure everything is mounted
                    setTimeout(() => handleTimerComplete(), 500);
                }
            }
        };
        restoreTimer();
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
                const remaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
                setTimeLeft(remaining);

                if (remaining <= 0) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
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
                setIsManualData(true);
                setLoading(false);
                return; // Exit early - don't fetch from API
            }
            setIsManualData(false);

            console.log('No manual UV set, checking location/API...');

            // Get location permission
            const { status } = await Location.requestForegroundPermissionsAsync();

            // Ensure Notification Permission (Critical for timer)
            await requestNotificationPermissions();

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

            // Fetch UV and Weather
            const weather = await fetchWeatherAndUV(
                currentLocation.coords.latitude,
                currentLocation.coords.longitude
            );

            if (weather) {
                setUvIndex(weather.uv);
                setWeatherData({
                    city: weather.city,
                    temperature: weather.temp,
                    condition: getWeatherCondition(weather.code),
                    uvIndex: weather.uv
                });
            } else {
                console.warn('Could not fetch weather data, falling back.');
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Could not fetch data. Using estimates.', ToastAndroid.LONG);
                }
                setUvIndex(5);
            }
            setLoading(false);

            setLoading(false);


        } catch (error) {
            console.error('Error initializing data:', error);
            setUvIndex(5);
            setLoading(false);
        }
    };

    const handleTimerComplete = async () => {
        setIsActive(false);
        setIsSessionComplete(true); // Show animated completion overlay
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Trigger haptic feedback
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Haptics error:', error);
        }

        // Clear persisted timer state
        await clearActiveTimer();

        // Send completion notification (only one, clean message)
        try {
            // Cancel any running timer notification first
            if (notificationIdRef.current) {
                await cancelNotification(notificationIdRef.current);
                notificationIdRef.current = null;
            }

            // Send single completion notification
            await scheduleImmediateNotification(
                '☀️ Sun Session Complete!',
                'Your safe sun session is complete. Stay protected!'
            );
        } catch (error) {
            console.error('Notification error:', error);
        }

        // Log the session to Firestore
        if (auth.currentUser) {
            await saveSessionToFirestore(auth.currentUser.uid, {
                uvIndex,
                duration: safeMinutes,
                skinType,
                isCloudy,
                hasSunscreen,
                date: new Date().toISOString(),
            });

            // Enforce Daily Limit
            await updateDailySession(auth.currentUser.uid);
            setIsDailyLimitReached(true);

            // Re-schedule daily notification to reflect success
            await updateDailyNotification();

            // Show Limit Popup
            Alert.alert(
                "Daily Limit Reached",
                "Your sun exposure session for today is finished. Please come back tomorrow.",
                [{ text: "OK" }]
            );
        }
    };

    const startTimer = async () => {
        if (isDailyLimitReached) {
            Alert.alert(
                "Daily Limit Reached",
                "Your sun exposure session for today is finished. Please come back tomorrow."
            );
            return;
        }

        // Set end timestamp based on current timeLeft
        const endTime = Date.now() + (timeLeft * 1000);
        setEndTimestamp(endTime);
        setIsActive(true);
        setHasStarted(true);

        // Schedule the "Time's Up" notification upfront for robust background handling
        try {
            // Cancel any previous
            if (notificationIdRef.current) {
                await cancelNotification(notificationIdRef.current);
            }

            // Schedule future notification
            const id = await scheduleNotificationAtDate(
                '⏰ Time\'s Up!',
                'Your safe sun exposure time is complete.',
                new Date(endTime)
            );
            notificationIdRef.current = id;
            console.log('Scheduled completion notification:', id);

            // PERSIST TIMER STATE
            await setActiveTimer(endTime, id);

            // Optional: Immediate notification to show timer is running
            await scheduleImmediateNotification(
                'Sun Timer Running ☀️',
                `Ends at ${new Date(endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`,
                { sound: false }
            );

        } catch (e) {
            console.error('Notification scheduling error:', e);
        }
    };

    const stopTimer = async () => {
        setIsActive(false);
        setEndTimestamp(null);
        await clearActiveTimer(); // Clear persisted state
        if (notificationIdRef.current) {
            await cancelNotification(notificationIdRef.current);
            notificationIdRef.current = null;
        }
    };

    const resetTimer = async () => {
        setIsActive(false);
        setEndTimestamp(null);
        setHasStarted(false);
        setIsSessionComplete(false); // Clear completion state
        await clearActiveTimer(); // Clear persisted state
        setTimeLeft(safeMinutes * 60);
        if (notificationIdRef.current) {
            await cancelNotification(notificationIdRef.current);
            notificationIdRef.current = null;
        }
    };

    // Handle "Start New Session" from completion overlay
    const handleStartNewSession = async () => {
        setIsSessionComplete(false);
        setHasStarted(false);
        setTimeLeft(safeMinutes * 60);
        // Small delay to let overlay close smoothly
        setTimeout(() => {
            startTimer();
        }, 300);
    };

    // Handle dismiss overlay
    const handleDismissOverlay = () => {
        setIsSessionComplete(false);
        setHasStarted(false);
        setTimeLeft(safeMinutes * 60);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Fetching UV data...</Text>
            </SafeAreaView>
        );
    }

    const uvCategory = getUVCategory(uvIndex || 0);
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const progress = (timeLeft / (safeMinutes * 60)) * 100;

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={isDark ? GRADIENTS.night : GRADIENTS.sunrise}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                opacity={isDark ? 0.8 : 0.3} // Slightly more opaque in dark mode for better contrast, subtle in light
            />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
                    <Animated.Text entering={ZoomIn.duration(800)} style={[styles.logo, { color: '#FF7043' }]}>Suntime</Animated.Text>
                </Animated.View>

                {/* FEATURE: WEATHER CARD */}
                {weatherData && (
                    <Animated.View entering={FadeInDown.delay(200)}>
                        <WeatherCard weatherData={weatherData} loading={false} />
                    </Animated.View>
                )}

                {/* FEATURE 1: UV INDEX COLOR SCALE */}
                <View style={styles.scaleContainer}>
                    <Text style={styles.scaleLabel}>UV Spectrum</Text>
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
                </View>

                {/* UV Card (Dark Opaque) */}
                <Animated.View entering={FadeInDown} style={styles.uvWidgetContainer}>
                    <View style={styles.uvWidgetContent}>
                        <View style={styles.uvTopRow}>
                            <Text style={styles.uvLabel}>UV INDEX</Text>
                            <View style={[styles.uvStatusChip, { backgroundColor: '#4CAF50' }]}>
                                <Text style={styles.uvStatusText}>Low</Text>
                            </View>
                        </View>
                        <Text style={styles.uvValueLarge}>{(uvIndex || 0).toFixed(1)}</Text>
                    </View>
                </Animated.View>

                {/* Safe Time Section (White Card) */}
                <Animated.View entering={ZoomIn} style={styles.timerCard}>
                    <View style={styles.timerHeader}>
                        <Text style={styles.timerLabel}>SAFE TIME</Text>
                        {isActive && <View style={styles.activeDot} />}
                    </View>

                    <Text style={styles.timerValueMain}>{formattedTime}</Text>

                    {/* Controls embedded in card or below? Reference says "Big white rounded card". 
                        Usually controls are inside or just below. I'll put controls below effectively.
                    */}
                </Animated.View>

                {/* Timer Controls (Below Card) */}
                <View style={styles.controlsContainer}>
                    {!isActive ? (
                        <TouchableOpacity onPress={startTimer} style={styles.shadowButtonWrapper}>
                            <LinearGradient
                                colors={GRADIENTS.primary}
                                style={[styles.startButton, isDailyLimitReached && { opacity: 0.5 }]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.buttonText}>
                                    {isDailyLimitReached ? 'Daily Limit Reached' : hasStarted ? 'Resume' : 'Start Timer'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.activeControls}>
                            <StandardButton
                                title="Pause"
                                onPress={stopTimer}
                                style={{ flex: 1 }}
                            />
                            <StandardButton
                                title="Reset"
                                onPress={resetTimer}
                                variant="secondary"
                                style={{ flex: 1, backgroundColor: colors.textSecondary }}
                            />
                        </View>
                    )}
                </View>
            {/* Environment Toggles */}
            <View style={styles.togglesContainer}>
                <TouchableOpacity
                    style={[
                        styles.toggle,
                        isCloudy && styles.toggleActive,
                        isActive && { opacity: 0.5 }
                    ]}
                    onPress={() => setIsCloudy(!isCloudy)}
                    disabled={isActive}
                >
                    <Text style={[styles.toggleText, isCloudy && styles.toggleTextActive]}>
                        Cloudy
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.toggle,
                        hasSunscreen && styles.toggleActive,
                        isActive && { opacity: 0.5 }
                    ]}
                    onPress={() => setHasSunscreen(!hasSunscreen)}
                    disabled={isActive}
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
                <View style={{ marginBottom: SPACING.md }}>
                    <Text style={[styles.riskLegendTitle, { marginBottom: 0 }]}>Risk Level Guide</Text>
                </View>
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

            {/* NO SENSOR DISCLAIMER */}
            <View style={styles.disclaimerContainer}>
                <Text style={styles.disclaimerText}>
                    ⚠️ No Sensor Detected. All values are estimates based on location and time.
                    Suntime does not use direct body sensors.
                </Text>
            </View>
        </ScrollView>

            {/* Session Complete Overlay */ }
    <SessionCompleteOverlay
        visible={isSessionComplete}
        duration={safeMinutes}
        onStartNew={handleStartNewSession}
        onDismiss={handleDismissOverlay}
    />

    {/* Whats New Modal */ }
    <WhatsNewModal
        visible={showWhatsNew}
        onClose={() => setShowWhatsNew(false)}
    />
        </SafeAreaView >
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    // New Loading state style
    loadingText: {
        marginTop: SPACING.md,
        color: colors.textSecondary,
        fontSize: moderateScale(16),
        fontWeight: '500',
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    logo: {
        fontSize: moderateScale(32),
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -1,
    },
    // Weather Card - New Feature
    // (See component)

    // UV Scale - New Feature
    scaleContainer: {
        marginBottom: SPACING.lg,
    },
    scaleLabel: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: SPACING.xs,
        marginLeft: SPACING.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    uvScale: {
        flexDirection: 'row',
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
        height: 32,
        backgroundColor: colors.cardBackground,
        ...SHADOWS.small,
    },
    scaleItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.3, // dimmed by default
    },
    scaleItemActive: {
        opacity: 1, // Full color when active
        transform: [{ scale: 1.1 }],
        zIndex: 1,
    },
    scaleText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        opacity: 0, // Hidden by default
    },
    scaleTextActive: {
        opacity: 1, // Visible when active
    },

    // UV Widget (Dark)
    uvWidgetContainer: {
        marginBottom: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        backgroundColor: '#222222', // Dark Charcoal
        ...SHADOWS.medium,
        overflow: 'hidden',
    },
    uvWidgetContent: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    uvTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        width: '100%',
        justifyContent: 'space-between'
    },
    uvLabel: {
        color: '#AAAAAA',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
    },
    uvStatusChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    uvStatusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    uvValueLarge: {
        fontSize: 64,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -2,
    },

    // Timer Card (White)
    timerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    timerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    timerLabel: {
        color: '#999999',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF7043',
        marginLeft: 8,
    },
    timerValueMain: {
        fontSize: 56,
        fontWeight: '800',
        color: '#333333',
        fontVariant: ['tabular-nums'], // Monospace numbers
    },
    controlsContainer: {
        width: '100%',
        paddingHorizontal: SPACING.lg,
    },
    activeControls: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    shadowButtonWrapper: {
        ...SHADOWS.button,
        borderRadius: BORDER_RADIUS.full,
    },
    startButton: {
        paddingVertical: 18,
        borderRadius: BORDER_RADIUS.full,
        alignItems: 'center',
        width: '100%',
    },
    buttonText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.white,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // Toggles
    togglesContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    toggle: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: colors.cardBackground,
        borderWidth: 1,
        borderColor: colors.border,
    },
    toggleActive: {
        backgroundColor: colors.text, // Invert
        borderColor: colors.text,
    },
    toggleText: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: colors.text,
    },
    toggleTextActive: {
        color: colors.background, // Invert
    },

    // Warnings
    warningBanner: {
        backgroundColor: '#FFEBEE',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        borderLeftWidth: 4,
        borderLeftColor: '#D32F2F',
    },
    warningTitle: {
        color: '#D32F2F',
        fontWeight: 'bold',
        marginBottom: 2,
    },
    warningText: {
        color: '#C62828',
        fontSize: moderateScale(12),
    },

    // Info Card
    infoCard: {
        backgroundColor: colors.cardBackground,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        ...GLASS.default, // optional glass effect
    },
    infoText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    infoHighlight: {
        color: colors.primary,
        fontWeight: '700',
    },

    // Risk Legend
    riskLegendCard: {
        backgroundColor: colors.cardBackground,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.xl,
    },
    riskLegendTitle: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    riskList: {
        marginTop: SPACING.sm,
    },
    riskRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    riskRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    riskDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    riskRange: {
        ...TYPOGRAPHY.caption,
        color: colors.text,
        fontWeight: '600',
        width: 40,
    },
    riskLevel: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
    },

    // Disclaimer
    disclaimerContainer: {
        padding: SPACING.lg,
        opacity: 0.6,
    },
    disclaimerText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
});
