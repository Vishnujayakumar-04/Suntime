import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Dimensions,
    Platform
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import { getSessionLogs } from '../utils/storage';

const screenWidth = Dimensions.get('window').width;

export default function HistoryScreen() {
    const [sessions, setSessions] = useState([]);
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        loadHistory();
    }, []);

    // Reload when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadHistory();
        }, [])
    );

    const loadHistory = async () => {
        try {
            const logs = await getSessionLogs();
            setSessions(logs);

            // Prepare last 7 days data for bar chart
            const last7Days = getLast7DaysData(logs);
            setChartData(last7Days);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    };

    const getLast7DaysData = (logs) => {
        const today = new Date();
        const labels = [];
        const durationData = [];

        // Create labels for last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(formatDate(date));

            // Find sessions for this day
            const daySessions = logs.filter((log) => {
                const logDate = new Date(log.date);
                return (
                    logDate.getDate() === date.getDate() &&
                    logDate.getMonth() === date.getMonth() &&
                    logDate.getFullYear() === date.getFullYear()
                );
            });

            // Aggregate data
            if (daySessions.length > 0) {
                const totalDuration = daySessions.reduce((sum, s) => sum + s.duration, 0);
                durationData.push(totalDuration);
            } else {
                durationData.push(0);
            }
        }

        return { labels, durationData };
    };

    const formatDate = (date) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[date.getDay()];
    };

    const formatFullDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Animated.View entering={FadeInDown}>
                    <Text style={styles.title}>Exposure History</Text>
                    <Text style={styles.subtitle}>Track your sun exposure sessions</Text>
                </Animated.View>

                {/* Bar Chart - Last 7 Days */}
                {chartData && chartData.durationData.some((v) => v > 0) ? (
                    <Animated.View
                        entering={ZoomIn}
                        style={styles.chartContainer}
                    >
                        <Text style={styles.chartTitle}>Exposure Time (mins) - Last 7 Days</Text>
                        <BarChart
                            data={{
                                labels: chartData.labels,
                                datasets: [{ data: chartData.durationData }],
                            }}
                            width={screenWidth - SPACING.lg * 2}
                            height={220}
                            yAxisLabel=""
                            yAxisSuffix="m"
                            chartConfig={{
                                backgroundColor: COLORS.white,
                                backgroundGradientFrom: COLORS.white,
                                backgroundGradientTo: COLORS.white,
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(26, 26, 26, ${opacity})`,
                                style: {
                                    borderRadius: BORDER_RADIUS.md,
                                },
                                propsForBackgroundLines: {
                                    strokeDasharray: '',
                                    stroke: COLORS.lightGray,
                                    strokeWidth: 1,
                                },
                            }}
                            style={styles.chart}
                            fromZero
                        />
                    </Animated.View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            No sessions yet. Start a timer on the home screen to track your exposure!
                        </Text>
                    </View>
                )}

                {/* Session List */}
                <Animated.View
                    style={styles.sessionListContainer}
                >
                    <Text style={styles.sectionTitle}>Recent Sessions</Text>
                    {sessions.length === 0 ? (
                        <Text style={styles.noDataText}>No sessions recorded yet</Text>
                    ) : (
                        sessions
                            .slice()
                            .reverse()
                            .slice(0, 10)
                            .map((session, index) => (
                                <Animated.View
                                    entering={FadeInDown}
                                    key={session.id}
                                    style={styles.sessionCard}
                                >
                                    <View style={styles.sessionHeader}>
                                        <Text style={styles.sessionDate}>
                                            {formatFullDate(session.date)}
                                        </Text>
                                    </View>
                                    <View style={styles.sessionDetails}>
                                        <View style={styles.sessionDetail}>
                                            <Text style={styles.sessionLabel}>UV Index</Text>
                                            <Text style={styles.sessionValue}>
                                                {session.uvIndex.toFixed(1)}
                                            </Text>
                                        </View>
                                        <View style={styles.sessionDetail}>
                                            <Text style={styles.sessionLabel}>Duration</Text>
                                            <Text style={styles.sessionValue}>
                                                {session.duration} min
                                            </Text>
                                        </View>
                                        <View style={styles.sessionDetail}>
                                            <Text style={styles.sessionLabel}>Skin Type</Text>
                                            <Text style={styles.sessionValue}>
                                                Type {session.skinType}
                                            </Text>
                                        </View>
                                    </View>
                                </Animated.View>
                            ))
                    )}
                </Animated.View>
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
    title: {
        ...TYPOGRAPHY.title,
        fontSize: moderateScale(32),
        marginBottom: SPACING.xs,
        paddingTop: SPACING.md,
    },
    subtitle: {
        ...TYPOGRAPHY.caption,
        marginBottom: SPACING.xl,
        color: COLORS.textSecondary,
    },
    chartContainer: {
        marginBottom: SPACING.xl,
    },
    chartTitle: {
        ...TYPOGRAPHY.subheading,
        marginBottom: SPACING.md,
        fontWeight: '600',
    },
    chart: {
        borderRadius: BORDER_RADIUS.lg,
    },
    emptyState: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        ...SHADOWS.small,
    },
    emptyStateEmoji: {
        fontSize: moderateScale(56),
        marginBottom: SPACING.lg,
    },
    emptyStateText: {
        ...TYPOGRAPHY.body,
        textAlign: 'center',
        color: COLORS.textSecondary,
        lineHeight: 24,
    },
    sessionListContainer: {
        marginTop: SPACING.md,
    },
    sectionTitle: {
        ...TYPOGRAPHY.heading,
        marginBottom: SPACING.lg,
    },
    noDataText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        padding: SPACING.lg,
    },
    sessionCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderLeftWidth: 5,
        borderLeftColor: COLORS.primary,
        ...SHADOWS.small,
    },
    sessionHeader: {
        marginBottom: SPACING.md,
    },
    sessionDate: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.text,
    },
    sessionDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sessionDetail: {
        flex: 1,
    },
    sessionLabel: {
        ...TYPOGRAPHY.caption,
        marginBottom: SPACING.xs,
        color: COLORS.textSecondary,
    },
    sessionValue: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.primary,
        fontWeight: '600',
    },
});
