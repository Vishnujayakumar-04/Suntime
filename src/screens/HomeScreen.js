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
    requestNotificationPermissions
} from '../utils/notifications';
import Animated, {
    FadeInDown,
    ZoomIn,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, COLORS } from '../constants/theme';

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
import SessionCompleteOverlay from '../components/SessionCompleteOverlay';
import WeatherCard from '../components/WeatherCard';

const APP_VERSION = '1.0.0';

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
    // We override styles to enforce the "Original" look regardless of theme for now, 
    // or we adapt delicately. The user asked for "Restore... EXACTLY".
    // Reference screenshots are Light/Peach mode.
    // I will force specific colors in styles but use theme for structure if needed.
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    // UV & Weather state
    const [uvIndex, setUvIndex] = useState(null);
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Timer state
    const [skinType, setSkinType] = useState(3);
    const [isCloudy, setIsCloudy] = useState(false);
    const [hasSunscreen, setHasSunscreen] = useState(false);
    const [safeMinutes, setSafeMinutes] = useState(30);
    const [isManualData, setIsManualData] = useState(false);

    // Modal state
    const [showWhatsNew, setShowWhatsNew] = useState(false);

    // Timer logic
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
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                try {
                    pulseValue.value = withRepeat(
                        withSequence(
                            withSpring(1.05, { damping: 2 }),
                            withSpring(1, { damping: 2 })
                        ),
                        -1,
                        true
                    );
                } catch (error) {
                    console.error('Animation error:', error);
                }
            });
        });
        return () => task.cancel();
    }, []);

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
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=uv_index,temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`;
            const response = await fetch(url);
            const data = await response.json();

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
                }
                return true;
            };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => backHandler.remove();
        }, [])
    );

    // AppState listener
    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
                const activeTimer = await getActiveTimer();
                if (activeTimer && activeTimer.endTimestamp) {
                    const now = Date.now();
                    const remaining = Math.max(0, Math.ceil((activeTimer.endTimestamp - now) / 1000));
                    if (remaining > 0) {
                        setEndTimestamp(activeTimer.endTimestamp);
                        setTimeLeft(remaining);
                        notificationIdRef.current = activeTimer.notificationId;
                        setHasStarted(true);
                        setIsActive(true);
                    } else {
                        await clearActiveTimer();
                        if (!hasStarted) handleTimerComplete();
                    }
                }
            }
        });
        return () => appStateSubscription.remove();
    }, [hasStarted]);

    // Schedule Daily Reminder
    const updateDailyNotification = useCallback(async () => {
        try {
            if (!auth.currentUser) return;
            const logs = await fetchSessions(auth.currentUser.uid);
            const today = new Date().toISOString().split('T')[0];
            const hasSessionToday = logs.some(log => log.date.startsWith(today));

            const scheduled = await getScheduledNotifications();
            const dailyId = scheduled.find(n => n.content?.title?.includes('Daily Sun Goal'))?.identifier;
            if (dailyId) await cancelNotification(dailyId);

            const content = hasSessionToday ? {
                title: 'Daily Sun Goal 🌞',
                body: 'Great job meeting your sunlight goal today!',
            } : {
                title: 'Daily Sun Goal 🌙',
                body: "You missed today's goal. Let's try again tomorrow!",
            };

            await scheduleDailyNotification(content.title, content.body, 18, 0);
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
        const restoreTimer = async () => {
            const activeTimer = await getActiveTimer();
            if (activeTimer) {
                if (activeTimer.endTimestamp > Date.now()) {
                    setEndTimestamp(activeTimer.endTimestamp);
                    notificationIdRef.current = activeTimer.notificationId;
                    setHasStarted(true);
                    setIsActive(true);
                } else {
                    await clearActiveTimer();
                    setTimeout(() => handleTimerComplete(), 500);
                }
            }
        };
        restoreTimer();
    }, []);

    useFocusEffect(
        useCallback(() => {
            initializeData();
        }, [])
    );

    useEffect(() => {
        if (uvIndex !== null && skinType !== null) {
            const newSafeTime = calculateSafeTime(uvIndex, skinType, isCloudy, hasSunscreen);
            setSafeMinutes(newSafeTime);
            if (!hasStarted && !isActive) {
                setTimeLeft(newSafeTime * 60);
            }
        }
    }, [uvIndex, skinType, isCloudy, hasSunscreen, hasStarted]);

    useEffect(() => {
        if (isActive && endTimestamp) {
            intervalRef.current = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    handleTimerComplete();
                }
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, endTimestamp]);

    const initializeData = async () => {
        try {
            const settings = await getUserSettings();
            setSkinType(settings.skinType || 3);

            const prefs = await getDefaultPreferences();
            setHasSunscreen(prefs.sunscreen === true);

            const manualUV = await getManualUV();
            if (manualUV !== null && manualUV !== undefined) {
                setUvIndex(manualUV);
                setIsManualData(true);
                setLoading(false);
                return;
            }
            setIsManualData(false);

            const { status } = await Location.requestForegroundPermissionsAsync();
            await requestNotificationPermissions();

            if (status !== 'granted') {
                Alert.alert('Location Permission Required');
                setUvIndex(5);
                setLoading(false);
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const weather = await fetchWeatherAndUV(currentLocation.coords.latitude, currentLocation.coords.longitude);

            if (weather) {
                setUvIndex(weather.uv);
                setWeatherData({
                    city: weather.city,
                    temperature: weather.temp,
                    condition: getWeatherCondition(weather.code),
                    uvIndex: weather.uv
                });
            } else {
                if (Platform.OS === 'android') ToastAndroid.show('Could not fetch data.', ToastAndroid.LONG);
                setUvIndex(5);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error initializing data:', error);
            setUvIndex(5);
            setLoading(false);
        }
    };

    const handleTimerComplete = async () => {
        setIsActive(false);
        setIsSessionComplete(true);
        if (intervalRef.current) clearInterval(intervalRef.current);

        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) { }
        await clearActiveTimer();

        try {
            if (notificationIdRef.current) await cancelNotification(notificationIdRef.current);
            await scheduleImmediateNotification('☀️ Sun Session Complete!', 'Your safe sun session is complete. Stay protected!');
        } catch (e) { }

        if (auth.currentUser) {
            await saveSessionToFirestore(auth.currentUser.uid, {
                uvIndex,
                duration: safeMinutes,
                skinType,
                isCloudy,
                hasSunscreen,
                date: new Date().toISOString(),
            });
            await updateDailySession(auth.currentUser.uid);
            setIsDailyLimitReached(true);
            await updateDailyNotification();
            Alert.alert("Daily Limit Reached", "Your sun exposure session for today is finished.", [{ text: "OK" }]);
        }
    };

    const startTimer = async () => {
        if (isDailyLimitReached) {
            Alert.alert("Daily Limit Reached", "Your sun exposure session for today is finished.");
            return;
        }
        const endTime = Date.now() + (timeLeft * 1000);
        setEndTimestamp(endTime);
        setIsActive(true);
        setHasStarted(true);

        try {
            if (notificationIdRef.current) await cancelNotification(notificationIdRef.current);
            const id = await scheduleNotificationAtDate('⏰ Time\'s Up!', 'Your safe sun exposure time is complete.', new Date(endTime));
            notificationIdRef.current = id;
            await setActiveTimer(endTime, id);
            await scheduleImmediateNotification('Sun Timer Running ☀️', `Ends at ${new Date(endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`, { sound: false });
        } catch (e) { }
    };

    const stopTimer = async () => {
        setIsActive(false);
        setEndTimestamp(null);
        await clearActiveTimer();
        if (notificationIdRef.current) {
            await cancelNotification(notificationIdRef.current);
            notificationIdRef.current = null;
        }
    };

    const resetTimer = async () => {
        setIsActive(false);
        setEndTimestamp(null);
        setHasStarted(false);
        setIsSessionComplete(false);
        await clearActiveTimer();
        setTimeLeft(safeMinutes * 60);
        if (notificationIdRef.current) {
            await cancelNotification(notificationIdRef.current);
            notificationIdRef.current = null;
        }
    };

    const handleStartNewSession = async () => {
        setIsSessionComplete(false);
        setHasStarted(false);
        setTimeLeft(safeMinutes * 60);
        setTimeout(() => startTimer(), 300);
    };

    const handleDismissOverlay = () => {
        setIsSessionComplete(false);
        setHasStarted(false);
        setTimeLeft(safeMinutes * 60);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#FF6F00" />
            </SafeAreaView>
        );
    }

    const uvCategory = getUVCategory(uvIndex || 0);
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={isDark ? GRADIENTS.night : ['#FFF3E0', '#FFE0B2']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                opacity={isDark ? 0.9 : 1}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Header */}
                <View style={styles.header}>
                    <Text style={styles.appTitle}>Suntime</Text>
                </View>

                {/* 2. Weather Card */}
                {weatherData && (
                    <View style={styles.weatherContainer}>
                        <WeatherCard weatherData={weatherData} loading={false} />
                    </View>
                )}

                {/* 3. UV Spectrum Bar */}
                <View style={styles.spectrumContainer}>
                    <Text style={styles.spectrumLabel}>UV SPECTRUM</Text>
                    <View style={styles.spectrumRow}>
                        {UV_SCALE_NUMBERS.map((num) => {
                            const isSelected = uvIndex !== null && (num === 11 ? uvIndex >= 11 : Math.round(uvIndex) === num);
                            return (
                                <View
                                    key={num}
                                    style={[
                                        styles.spectrumDot,
                                        { backgroundColor: getScaleColor(num) },
                                        isSelected && styles.spectrumDotActive
                                    ]}
                                >
                                    <Text style={styles.spectrumText}>
                                        {num}{num === 11 ? '+' : ''}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* 4. UV Index Card */}
                <View style={styles.uvIndexCard}>
                    <Text style={styles.uvIndexLabel}>UV INDEX</Text>
                    <Text style={[styles.uvIndexValue, { color: uvCategory.color }]}>
                        {(uvIndex || 0).toFixed(1)}
                    </Text>
                    <Text style={[styles.uvIndexStatus, { color: uvCategory.color }]}>
                        {uvCategory.level}
                    </Text>
                </View>

                {/* 5. Safe Time Card */}
                <View style={styles.safeTimeCard}>
                    <View style={styles.timerDisplay}>
                        <Text style={styles.timerText}>{formattedTime}</Text>
                        <Text style={styles.timerSubText}>SAFE TIME</Text>
                    </View>

                    <View style={styles.timerButtonContainer}>
                        {!isActive ? (
                            <TouchableOpacity style={styles.timerButton} onPress={startTimer}>
                                <Text style={styles.timerButtonText}>
                                    {isDailyLimitReached ? 'Daily Limit Reached' : hasStarted ? 'Resume' : 'Start Timer'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity style={[styles.timerButton, { flex: 1, backgroundColor: '#FFA726' }]} onPress={stopTimer}>
                                    <Text style={styles.timerButtonText}>Pause</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.timerButton, { flex: 1, backgroundColor: '#E0E0E0' }]} onPress={resetTimer}>
                                    <Text style={[styles.timerButtonText, { color: '#333' }]}>Reset</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* 6. Environment Toggles */}
                <View style={styles.togglesRow}>
                    <TouchableOpacity
                        style={[styles.toggleButton, isCloudy && styles.toggleButtonActive]}
                        onPress={() => setIsCloudy(!isCloudy)}
                        disabled={isActive}
                    >
                        <Text style={[styles.toggleButtonText, isCloudy && { color: '#FF6F00' }]}>Cloudy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toggleButton, hasSunscreen && styles.toggleButtonActive]}
                        onPress={() => setHasSunscreen(!hasSunscreen)}
                        disabled={isActive}
                    >
                        <Text style={[styles.toggleButtonText, hasSunscreen && { color: '#FF6F00' }]}>Sunscreen</Text>
                    </TouchableOpacity>
                </View>

                {/* 7. Safe Exposure Info Card */}
                <View style={styles.exposureInfoCard}>
                    <View style={styles.exposureInfoBorder} />
                    <Text style={styles.exposureInfoText}>
                        Your safe sun exposure time: <Text style={{ fontWeight: 'bold', color: '#E65100' }}>{safeMinutes} minutes</Text>
                    </Text>
                </View>

                {/* 8. Risk Level Guide */}
                <View style={styles.riskGuideCard}>
                    <Text style={styles.riskGuideTitle}>Risk Level Guide</Text>
                    {RISK_LEVELS.map((item, index) => (
                        <View key={index} style={styles.riskRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.riskDot, { backgroundColor: item.color }]} />
                                <Text style={styles.riskRange}>{item.range}</Text>
                            </View>
                            <Text style={[styles.riskLevel, { color: item.color }]}>{item.level}</Text>
                        </View>
                    ))}
                </View>

                {/* 9. Disclaimer */}
                <View style={styles.disclaimerBanner}>
                    <Text style={styles.disclaimerText}>
                        ⚠️ Estimates only. Not medical advice.
                    </Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {isSessionComplete && (
                <SessionCompleteOverlay
                    visible={isSessionComplete}
                    onStartNew={handleStartNewSession}
                    onDismiss={handleDismissOverlay}
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? colors.background : '#FFF3E0',
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    header: {
        marginBottom: SPACING.md,
        marginTop: SPACING.sm,
    },
    appTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: isDark ? colors.primary : '#FF6F00',
    },
    weatherContainer: {
        marginBottom: SPACING.lg,
    },
    spectrumContainer: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    spectrumLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
        letterSpacing: 1,
        textTransform: 'uppercase'
    },
    spectrumRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap'
    },
    spectrumDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    spectrumDotActive: {
        borderWidth: 2,
        borderColor: colors.text,
        transform: [{ scale: 1.2 }]
    },
    spectrumText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFF'
    },
    uvIndexCard: {
        backgroundColor: isDark ? colors.cardBackground : '#212121',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        height: 160,
        ...SHADOWS.medium,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    uvIndexLabel: {
        color: isDark ? colors.textSecondary : '#BDBDBD',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 4,
    },
    uvIndexValue: {
        fontSize: 64,
        fontWeight: 'bold',
        marginBottom: 4,
        fontVariant: ['tabular-nums'],
    },
    uvIndexStatus: {
        fontSize: 18,
        fontWeight: '600',
    },
    safeTimeCard: {
        backgroundColor: isDark ? colors.cardBackground : '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: SPACING.lg,
        ...SHADOWS.medium,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    timerDisplay: {
        alignItems: 'center',
        marginBottom: 24,
    },
    timerText: {
        fontSize: 56,
        fontWeight: 'bold',
        color: colors.text,
        fontVariant: ['tabular-nums'],
    },
    timerSubText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginTop: -4,
        letterSpacing: 1,
    },
    timerButtonContainer: {
        width: '100%',
    },
    timerButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        width: '100%',
        ...SHADOWS.small,
    },
    timerButtonText: {
        color: '#FFFFFF', // Always white on primary button
        fontSize: 18,
        fontWeight: 'bold',
    },
    togglesRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    toggleButton: {
        flex: 1,
        backgroundColor: isDark ? colors.cardBackground : '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    toggleButtonActive: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    toggleButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    exposureInfoCard: {
        backgroundColor: isDark ? colors.cardBackground : '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        ...SHADOWS.small,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    exposureInfoBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
        backgroundColor: colors.primary,
    },
    exposureInfoText: {
        fontSize: 15,
        color: colors.text,
        marginLeft: 8,
    },
    riskGuideCard: {
        backgroundColor: isDark ? colors.cardBackground : '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    riskGuideTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: colors.text,
    },
    riskRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    riskRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    riskDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    riskRange: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    riskLevel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    disclaimerBanner: {
        backgroundColor: '#1E3A8A', // Keep blue
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    disclaimerText: {
        color: '#FFFFFF',
        fontSize: 12,
        opacity: 0.9,
    },
});
