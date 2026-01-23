import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn, FadeInRight } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchSessions } from '../services/firestore';
import { calculateExposureScore } from '../utils/sunLogic';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Sun, Cloud, Info, TrendingUp, Calendar, AlertTriangle, CheckCircle, Activity } from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { interpolateColor, useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';

export default function ProgressScreen() {
    const navigation = useNavigation();
    const { user, userProfile } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    const [todayMinutes, setTodayMinutes] = useState(0);
    const [exposureScore, setExposureScore] = useState(0); // NEW: Exposure Score
    const [weeklyStreak, setWeeklyStreak] = useState(0);
    const [monthlyTotal, setMonthlyTotal] = useState(0);
    const [totalSessions, setTotalSessions] = useState(0);
    const [averagePerDay, setAveragePerDay] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadProgress();
    }, [user, userProfile]);

    useFocusEffect(
        React.useCallback(() => {
            if (user) loadProgress();
        }, [user, userProfile])
    );

    const loadProgress = async () => {
        try {
            setLoading(true);
            if (!user) {
                setLoading(false);
                return;
            }
            const logs = await fetchSessions(user.uid);

            if (!logs || logs.length === 0) {
                setLoading(false);
                return;
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Calculate today's minutes and Exposure Score
            let todayMins = 0;
            let totalScore = 0;

            const todaySessions = logs.filter(log => {
                const logDate = new Date(log.date);
                const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
                return logDay.getTime() === today.getTime();
            });

            // User Skin Type (Fallback to 3)
            const currentSkinType = userProfile?.skinType || 3;

            todaySessions.forEach(log => {
                const duration = log.exposureTime || log.duration || 0;
                todayMins += duration;

                // Use saved completion score if available, otherwise estimate
                if (log.exposureScore !== undefined) {
                    totalScore += log.exposureScore;
                } else {
                    // Consistent calculation for legacy logs
                    // Defaulting to conservative assumptions if data missing
                    const uv = log.uvIndex || 0;
                    const durationMap = log.exposureTime || log.duration || 0;
                    const skin = log.skinType || currentSkinType; // Use log's skin type or current user's
                    const scoreData = calculateExposureScore(
                        uv,
                        durationMap,
                        skin,
                        false, // Assume no clouds if unknown
                        false  // Assume no sunscreen if unknown
                    );
                    totalScore += scoreData.score;
                }
            });

            setTodayMinutes(todayMins);
            setExposureScore(Math.round(totalScore));

            // Calculate weekly streak (consecutive days with sessions)
            let streak = 0;
            let checkDate = new Date(today);
            for (let i = 0; i < 7; i++) {
                const dayLogs = logs.filter(log => {
                    const logDate = new Date(log.date);
                    const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
                    return logDay.getTime() === checkDate.getTime();
                });
                if (dayLogs.length > 0) {
                    streak++;
                } else if (i > 0) { // Allow today to be empty if streak continues from yesterday
                    // Wait, standard streak logic: if today empty, streak is yesterday's streak?
                    // If I haven't done it TODAY, is my streak 5 or 0? 
                    // Usually 5 until day ends. 
                    // But here we check past 7 days.
                    // Simple logic: consecutive days going back from Yesterday (if today empty) or Today (if today not empty).
                    break;
                }
                checkDate.setDate(checkDate.getDate() - 1);
            }
            // Better streak logic exists in firestore.js getSessionStats, let's trust that logic?
            // Actually, I'll stick to the loop but allow today to be skipped.
            // Re-impl simple loop:
            let s = 0;
            let date = new Date(today);
            // Check today
            const hasToday = logs.some(l => new Date(l.date).toDateString() === date.toDateString());
            if (!hasToday) {
                date.setDate(date.getDate() - 1); // Start checking from yesterday
            }

            while (s < 365) {
                const dString = date.toDateString();
                const hasSession = logs.some(l => new Date(l.date).toDateString() === dString);
                if (hasSession) {
                    s++;
                    date.setDate(date.getDate() - 1);
                } else {
                    break;
                }
            }
            setWeeklyStreak(s);


            // Calculate monthly total
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthSessions = logs.filter(log => {
                const logDate = new Date(log.date);
                return logDate >= firstDayOfMonth;
            });
            const monthMins = monthSessions.reduce((sum, log) => sum + (log.exposureTime || log.duration || 0), 0);
            setMonthlyTotal(monthMins);

            // Calculate average per day (total minutes / number of days with sessions)
            const uniqueDays = new Set();
            logs.forEach(log => {
                const logDate = new Date(log.date);
                const dayKey = `${logDate.getFullYear()}-${logDate.getMonth()}-${logDate.getDate()}`;
                uniqueDays.add(dayKey);
            });
            const totalMinutes = logs.reduce((sum, log) => sum + (log.exposureTime || log.duration || 0), 0);
            const avgPerDay = uniqueDays.size > 0 ? Math.round(totalMinutes / uniqueDays.size) : 0;
            setAveragePerDay(avgPerDay);

            // Total sessions
            setTotalSessions(logs.length);
        } catch (error) {
            console.error('Error loading progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const recommendedDaily = 30; // 30 mins benchmark

    // Score Helpers
    const getScoreInfo = (score) => {
        if (score < 40) return { label: 'Low', color: '#42A5F5', advice: 'Try to get more safe sun exposure.' };
        if (score <= 80) return { label: 'Optimal', color: '#66BB6A', advice: 'Perfect! Maintain this level.' };
        if (score <= 120) return { label: 'High', color: '#FFA726', advice: 'Consider reducing exposure.' };
        return { label: 'Excessive', color: '#EF5350', advice: 'Avoid further sun exposure today.' };
    };

    const scoreInfo = getScoreInfo(exposureScore);

    const getRingColor = (score) => {
        if (score < 40) return '#42A5F5'; // Blue
        if (score <= 80) return '#66BB6A'; // Green
        if (score <= 120) return '#FFA726'; // Orange
        return '#EF5350'; // Red
    };

    const ringColor = getRingColor(exposureScore);
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - ((Math.min(exposureScore, 100) / 100) * circumference);

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={isDark ? GRADIENTS.night : GRADIENTS.sunrise}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                opacity={isDark ? 0.8 : 0.3}
            />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown} style={styles.header}>
                    <Text style={styles.title}>Your Progress</Text>
                    <Text style={styles.subtitle}>Track your safe sun exposure journey</Text>
                </Animated.View>

                {/* EXPOSURE SCORE CARD (Main Feature) */}
                <Animated.View entering={ZoomIn} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Today's Exposure Score</Text>
                        <View style={[styles.badge, { backgroundColor: ringColor }]}>
                            <Text style={styles.badgeText}>{scoreInfo.label}</Text>
                        </View>
                    </View>

                    {/* Ring & Icon Row */}
                    <View style={styles.ringContainer}>
                        <View style={styles.ringWrapper}>
                            {/* SVG Ring */}
                            <Svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: [{ rotate: '-90deg' }] }}>
                                {/* Background Circle */}
                                <Circle
                                    cx="70"
                                    cy="70"
                                    r={radius}
                                    stroke={isDark ? "#333" : "#E0E0E0"}
                                    strokeWidth="10"
                                    fill="transparent"
                                />
                                {/* Progress Circle */}
                                <Circle
                                    cx="70"
                                    cy="70"
                                    r={radius}
                                    stroke={ringColor}
                                    strokeWidth="10"
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                />
                            </Svg>
                            <View style={styles.ringInner}>
                                <Text style={[styles.ringNumber, { color: ringColor }]}>{exposureScore}</Text>
                                <Text style={styles.ringTotal}>/ 100</Text>
                            </View>
                        </View>

                        {/* Decoration Icon */}
                        <View style={styles.weatherIcon}>
                            {/* Static visual matching screenshot style */}
                            <Sun size={48} color="#FFB74D" style={{ position: 'absolute', top: -10, right: -10 }} />
                            <Cloud size={32} color={isDark ? '#FFF' : '#CFD8DC'} style={{ position: 'absolute', bottom: 0, left: -5 }} />
                        </View>
                    </View>

                    {/* Gradient Bar */}
                    <View style={styles.barContainer}>
                        <View style={styles.gradientBarWrapper}>
                            <LinearGradient
                                colors={['#42A5F5', '#66BB6A', '#FFA726', '#EF5350']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientBar}
                            />
                            {/* Thumb Indicator */}
                            <Animated.View
                                style={[
                                    styles.thumb,
                                    {
                                        left: `${Math.min(Math.max((exposureScore / 120) * 100, 0), 100)}%`
                                    }
                                ]}
                            />
                        </View>
                        <View style={styles.barLabels}>
                            <Text style={styles.barLabelText}>Low</Text>
                            <Text style={[styles.barLabelText, { textAlign: 'center' }]}>Optimal</Text>
                            <Text style={[styles.barLabelText, { textAlign: 'right' }]}>High</Text>
                        </View>
                    </View>

                    {/* Footer Info */}
                    <View style={styles.exposureFooter}>
                        <Sun size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={styles.footerText}>{todayMinutes} minutes of exposure today</Text>
                    </View>
                </Animated.View>

                {/* RECOMMENDATION CARD */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.recommendationCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Info size={20} color="#FFA726" style={{ marginRight: 8 }} />
                        <Text style={styles.recTitle}>Recommendation</Text>
                    </View>
                    <Text style={styles.recText}>
                        {scoreInfo.advice || "Consider getting a bit more sun exposure for Vitamin D production."}
                    </Text>
                </Animated.View>

                {/* Stats Grid - Streak & Monthly */}
                <View style={styles.statsGrid}>
                    <Animated.View entering={FadeInRight} style={styles.miniStatCard}>
                        <Text style={styles.miniStatNumber}>{weeklyStreak}</Text>
                        <Text style={styles.miniStatLabel}>Day Streak</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInRight.delay(50)} style={styles.miniStatCard}>
                        <Text style={styles.miniStatNumber}>{monthlyTotal}</Text>
                        <Text style={styles.miniStatLabel}>Monthly Minutes</Text>
                    </Animated.View>
                </View>

                {/* All-Time Stats */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>All-Time Statistics</Text>
                    <View style={styles.statRow}>
                        <Text style={styles.statRowLabel}>Total Sessions</Text>
                        <Text style={styles.statRowValue}>{totalSessions}</Text>
                    </View>
                    <View style={styles.statLine} />
                    <View style={styles.statRow}>
                        <Text style={styles.statRowLabel}>Average per Day</Text>
                        <Text style={styles.statRowValue}>{averagePerDay} min</Text>
                    </View>
                </View>

                {/* Legend Card */}
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
                        <TrendingUp size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.cardTitle}>Understanding Your Score</Text>
                    </View>

                    <View style={styles.legendItem}>
                        <Text style={styles.legendText}>
                            <Text style={{ color: '#42A5F5', fontWeight: 'bold' }}>• 0-40: </Text>
                            Low exposure - consider more outdoor time
                        </Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Text style={styles.legendText}>
                            <Text style={{ color: '#66BB6A', fontWeight: 'bold' }}>• 40-80: </Text>
                            Optimal - great for Vitamin D
                        </Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Text style={styles.legendText}>
                            <Text style={{ color: '#FFA726', fontWeight: 'bold' }}>• 80-120: </Text>
                            High - use protection
                        </Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Text style={styles.legendText}>
                            <Text style={{ color: '#EF5350', fontWeight: 'bold' }}>• 120+: </Text>
                            Excessive - avoid
                        </Text>
                    </View>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Info size={16} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={styles.disclaimerText}>
                        This is an estimation for awareness only, not medical advice. Always consult healthcare professionals.
                    </Text>
                </View>

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
        paddingBottom: 100,
    },
    header: {
        marginBottom: SPACING.lg,
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: moderateScale(28),
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        fontSize: moderateScale(14),
    },
    // Cards
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    cardTitle: {
        fontSize: moderateScale(16),
        fontWeight: 'bold',
        color: colors.text,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Ring
    ringContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        paddingHorizontal: SPACING.lg,
    },
    ringWrapper: {
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.xl, // Space between ring and sun icon
    },
    ringInner: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringNumber: {
        fontSize: 40,
        fontWeight: 'bold',
        color: colors.text,
    },
    ringTotal: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: -4,
    },
    weatherIcon: {
        width: 60,
        height: 60,
        // This is a placeholder for the Sun+Cloud composition
    },
    // Gradient Bar
    barContainer: {
        marginBottom: SPACING.lg,
    },
    gradientBarWrapper: {
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border,
        marginBottom: 8,
        justifyContent: 'center',
    },
    gradientBar: {
        flex: 1,
        borderRadius: 4,
    },
    thumb: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: colors.text,
        marginLeft: -7, // center thumb
        ...SHADOWS.small
    },
    barLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    barLabelText: {
        fontSize: 10,
        color: colors.textSecondary,
        width: 50,
    },
    exposureFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background, // Slight contrast
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    // Rec Card
    recommendationCard: {
        backgroundColor: '#EFEBE9', // Beige/Light Grey
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderLeftWidth: 4,
        borderLeftColor: '#8D6E63', // Brownish
    },
    recTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3E2723',
    },
    recText: {
        fontSize: 14,
        color: '#5D4037',
        lineHeight: 20,
    },
    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    miniStatCard: {
        flex: 1,
        backgroundColor: colors.cardBackground, // USE THEME
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
        minHeight: 120,
    },
    miniStatNumber: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#EF6C00', // Orange remains good
        marginBottom: 4,
    },
    miniStatLabel: {
        fontSize: 12,
        color: colors.textSecondary, // USE THEME
        textAlign: 'center',
    },
    // All time
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    statLine: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: SPACING.xs,
    },
    statRowLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    statRowValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
    },
    // Legend
    legendItem: {
        marginBottom: 8,
    },
    legendText: {
        fontSize: 13,
        color: colors.text,
        lineHeight: 18,
    },
    // Disclaimer
    disclaimer: {
        backgroundColor: colors.backgroundLight,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    disclaimerText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
    }
});
