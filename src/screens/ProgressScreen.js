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
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react-native';

export default function ProgressScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
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
    }, [user]);

    useFocusEffect(
        React.useCallback(() => {
            if (user) loadProgress();
        }, [user])
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
            let dailyScoreRaw = 0;

            const todaySessions = logs.filter(log => {
                const logDate = new Date(log.date);
                const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
                return logDay.getTime() === today.getTime();
            });

            todaySessions.forEach(log => {
                const duration = log.exposureTime || log.duration || 0;
                const uv = log.uvIndex || 0;
                todayMins += duration;
                // Score = UV * Time. Scaling: 100 units = Score 50 (Optimal)
                dailyScoreRaw += (uv * duration);
            });

            setTodayMinutes(todayMins);
            const calculatedScore = Math.min(100, Math.round(dailyScoreRaw * 0.5)); // Scaling factor 0.5
            setExposureScore(calculatedScore);

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
                } else {
                    break;
                }
                checkDate.setDate(checkDate.getDate() - 1);
            }
            setWeeklyStreak(streak);

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
        if (score < 40) return { label: 'Insufficient', color: '#EF5350', advice: 'Try to get more safe sun exposure.' };
        if (score <= 70) return { label: 'Optimal', color: '#66BB6A', advice: 'Perfect! Maintain this level.' };
        return { label: 'High', color: '#FFA726', advice: 'Consider reducing exposure.' };
    };

    const scoreInfo = getScoreInfo(exposureScore);

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
                <Animated.View
                    entering={FadeInDown}
                    style={styles.header}
                >
                    <View style={styles.headerTop}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Home')}
                            style={styles.backButton}
                        >
                            <ArrowLeft color={colors.text} size={24} />
                        </TouchableOpacity>

                    </View>
                    <Text style={styles.title}>Your Progress</Text>
                    <Text style={styles.subtitle}>
                        Track your safe sun exposure journey
                    </Text>
                </Animated.View>

                {/* EXPOSURE SCORE CARD */}
                <Animated.View entering={ZoomIn} style={styles.card}>
                    <Text style={styles.cardTitle}>Daily Exposure Score</Text>
                    <View style={{ alignItems: 'center', marginBottom: SPACING.md }}>
                        <Text style={[styles.largeNumber, { color: scoreInfo.color }]}>
                            {exposureScore}
                        </Text>
                        <Text style={[styles.scoreLabel, { color: scoreInfo.color }]}>
                            {scoreInfo.label}
                        </Text>
                    </View>
                    {/* Score Bar */}
                    <View style={styles.scoreBarCtx}>
                        <View style={[styles.scoreBarFill, { width: `${Math.min(exposureScore, 100)}%`, backgroundColor: scoreInfo.color }]} />
                    </View>
                    <Text style={styles.scoreAdvice}>{scoreInfo.advice}</Text>
                </Animated.View>

                {/* Today's Minutes */}
                <Animated.View
                    entering={ZoomIn.delay(100)}
                    style={styles.card}
                >
                    <Text style={styles.cardTitle}>Today's Duration</Text>
                    <View style={styles.progressContainer}>
                        <Text style={styles.largeNumber}>{todayMinutes}</Text>
                        <Text style={styles.largeUnit}>minutes</Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                            <LinearGradient
                                colors={GRADIENTS.primary}
                                style={[
                                    styles.progressBarFill,
                                    { width: `${Math.min((todayMinutes / recommendedDaily) * 100, 100)}%` }
                                ]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {Math.round((todayMinutes / recommendedDaily) * 100)}% of daily goal
                        </Text>
                    </View>
                </Animated.View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {/* Weekly Streak */}
                    <Animated.View
                        entering={FadeInRight}
                        style={styles.statCard}
                    >
                        <Text style={styles.statNumber}>{weeklyStreak}</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </Animated.View>

                    {/* Monthly Total */}
                    <Animated.View
                        entering={FadeInRight}
                        style={styles.statCard}
                    >
                        <Text style={styles.statNumber}>{monthlyTotal}</Text>
                        <Text style={styles.statLabel}>Monthly Minutes</Text>
                    </Animated.View>
                </View>

                {/* All-Time Stats */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>All-Time Statistics</Text>

                    <View style={styles.statRow}>
                        <Text style={styles.statRowLabel}>Total Sessions</Text>
                        <Text style={styles.statRowValue}>{totalSessions}</Text>
                    </View>

                    <View style={styles.statRow}>
                        <Text style={styles.statRowLabel}>Average per Day</Text>
                        <Text style={styles.statRowValue}>
                            {averagePerDay} min
                        </Text>
                    </View>
                </View>

                {/* Tips Card */}
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>Did you know?</Text>
                    <Text style={styles.tipsText}>
                        Getting 10-30 minutes of midday sun several times per week helps your body produce Vitamin D naturally. Remember to never burn!
                    </Text>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        Progress tracking is for awareness only. Always listen to your body and consult healthcare professionals for medical advice.
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
        paddingBottom: moderateScale(100),
    },
    header: {
        marginBottom: SPACING.lg,
        paddingTop: SPACING.xs,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Changed to space-between for menu
        marginBottom: SPACING.xs,
    },
    backButton: {
        marginRight: SPACING.sm,
        padding: SPACING.xs,
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: moderateScale(32),
        color: colors.text,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        lineHeight: 24,
        marginTop: SPACING.xs,
    },
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.lg,
        ...SHADOWS.medium,
        ...(colors.background === '#121212' ? GLASS.dark : GLASS.default),
        borderWidth: 0,
    },
    cardTitle: {
        ...TYPOGRAPHY.heading,
        marginBottom: SPACING.lg,
        color: colors.text,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    largeNumber: {
        fontSize: moderateScale(64),
        fontWeight: 'bold',
        color: colors.primary,
        marginRight: SPACING.sm,
    },
    largeUnit: {
        ...TYPOGRAPHY.subheading,
        color: colors.textSecondary,
    },
    progressBarContainer: {
        marginTop: SPACING.md,
    },
    progressBarBackground: {
        height: moderateScale(12),
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: BORDER_RADIUS.full,
    },
    progressText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.small,
        ...(colors.background === '#121212' ? GLASS.dark : GLASS.default),
        borderWidth: 0,
    },
    statEmoji: {
        fontSize: moderateScale(40),
        marginBottom: SPACING.sm,
    },
    statNumber: {
        fontSize: moderateScale(32),
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: SPACING.xs,
    },
    statLabel: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statRowLabel: {
        ...TYPOGRAPHY.body,
        color: colors.text,
    },
    statRowValue: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        color: colors.primary,
    },
    tipsCard: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary,
        ...SHADOWS.small,
    },
    tipsTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: 'bold',
        marginBottom: SPACING.sm,
        color: colors.text,
    },
    tipsText: {
        ...TYPOGRAPHY.body,
        lineHeight: 24,
        color: colors.text,
    },
    disclaimer: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginTop: SPACING.md,
    },
    disclaimerText: {
        ...TYPOGRAPHY.caption,
        fontStyle: 'italic',
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    // Score Styles
    scoreLabel: {
        ...TYPOGRAPHY.subheading,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreBarCtx: {
        height: 8,
        backgroundColor: colors.backgroundLight,
        borderRadius: 4,
        width: '100%',
        marginBottom: SPACING.md,
        overflow: 'hidden'
    },
    scoreBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    scoreAdvice: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        textAlign: 'center',
    }
});
