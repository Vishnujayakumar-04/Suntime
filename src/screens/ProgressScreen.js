import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Platform
} from 'react-native';
import Animated, { FadeInDown, ZoomIn, FadeInRight } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import { getSessionLogs } from '../utils/storage';

export default function ProgressScreen() {
    const [todayMinutes, setTodayMinutes] = useState(0);
    const [weeklyStreak, setWeeklyStreak] = useState(0);
    const [monthlyTotal, setMonthlyTotal] = useState(0);
    const [totalSessions, setTotalSessions] = useState(0);

    useEffect(() => {
        loadProgress();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadProgress();
        }, [])
    );

    const loadProgress = async () => {
        try {
            const logs = await getSessionLogs();
            if (!logs || logs.length === 0) {
                return;
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Calculate today's minutes
            const todaySessions = logs.filter(log => {
                const logDate = new Date(log.date);
                const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
                return logDay.getTime() === today.getTime();
            });
            const todayMins = todaySessions.reduce((sum, log) => sum + log.duration, 0);
            setTodayMinutes(todayMins);

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
            const monthMins = monthSessions.reduce((sum, log) => sum + log.duration, 0);
            setMonthlyTotal(monthMins);

            // Total sessions
            setTotalSessions(logs.length);
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    };

    const recommendedDaily = 15; // Recommended daily minutes

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View
                    entering={FadeInDown}
                    style={styles.header}
                >
                    <Text style={styles.title}>Your Progress</Text>
                    <Text style={styles.subtitle}>
                        Track your safe sun exposure journey
                    </Text>
                </Animated.View>

                {/* Today's Progress */}
                <Animated.View
                    entering={ZoomIn}
                    style={styles.card}
                >
                    <Text style={styles.cardTitle}>Today's Sun Exposure</Text>
                    <View style={styles.progressContainer}>
                        <Text style={styles.largeNumber}>{todayMinutes}</Text>
                        <Text style={styles.largeUnit}>minutes</Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${Math.min((todayMinutes / recommendedDaily) * 100, 100)}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {Math.round((todayMinutes / recommendedDaily) * 100)}% of recommended
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
                            {totalSessions > 0 ? Math.round(todayMinutes) : 0} min
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: moderateScale(100),
    },
    header: {
        marginBottom: SPACING.xl,
        paddingTop: SPACING.md,
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: moderateScale(32),
        marginBottom: SPACING.xs,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        lineHeight: 24,
    },
    card: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.lg,
        ...SHADOWS.medium,
    },
    cardTitle: {
        ...TYPOGRAPHY.heading,
        marginBottom: SPACING.lg,
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
        color: COLORS.primary,
        marginRight: SPACING.sm,
    },
    largeUnit: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.textSecondary,
    },
    progressBarContainer: {
        marginTop: SPACING.md,
    },
    progressBarBackground: {
        height: moderateScale(12),
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.full,
    },
    progressText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
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
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    statEmoji: {
        fontSize: moderateScale(40),
        marginBottom: SPACING.sm,
    },
    statNumber: {
        fontSize: moderateScale(32),
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    statLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    statRowLabel: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
    },
    statRowValue: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        color: COLORS.primary,
    },
    tipsCard: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.primary,
        ...SHADOWS.small,
    },
    tipsTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: 'bold',
        marginBottom: SPACING.sm,
    },
    tipsText: {
        ...TYPOGRAPHY.body,
        lineHeight: 24,
        color: COLORS.text,
    },
    disclaimer: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        marginTop: SPACING.md,
    },
    disclaimerText: {
        ...TYPOGRAPHY.caption,
        fontStyle: 'italic',
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
