import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, Sun, User, Calendar } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GLASS } from '../constants/theme';
import { fetchSessions } from '../services/firestore';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

export default function HistoryScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const navigation = useNavigation();
    const [sessions, setSessions] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Dynamic Styles - Memoized
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    useEffect(() => {
        if (user) loadHistory();
    }, [user]);

    useFocusEffect(
        React.useCallback(() => {
            if (user) loadHistory();
        }, [user])
    );

    const loadHistory = async () => {
        try {
            setLoading(true);
            if (!user) {
                setLoading(false);
                return;
            }
            const logs = await fetchSessions(user.uid);
            setSessions(logs || []);
            const last7Days = getLast7DaysData(logs || []);
            setChartData(last7Days);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getLast7DaysData = (logs) => {
        const today = new Date();
        const labels = [];
        const durationData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(formatDate(date));

            const daySessions = logs.filter((log) => {
                const logDate = new Date(log.date);
                return (
                    logDate.getDate() === date.getDate() &&
                    logDate.getMonth() === date.getMonth() &&
                    logDate.getFullYear() === date.getFullYear()
                );
            });

            if (daySessions.length > 0) {
                const totalDuration = daySessions.reduce((sum, s) => sum + (s.exposureTime || s.duration || 0), 0);
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

    // Chart Configuration
    const chartConfig = {
        backgroundGradientFrom: isDark ? '#1E1E1E' : '#FFFFFF',
        backgroundGradientFromOpacity: 0,
        backgroundGradientTo: isDark ? '#1E1E1E' : '#FFFFFF',
        backgroundGradientToOpacity: 0,
        color: (opacity = 1) => isDark ? `rgba(255, 152, 0, ${opacity})` : `rgba(239, 108, 0, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.6,
        useShadowColorFromDataset: false,
        decimalPlaces: 0,
        labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(100, 100, 100, ${opacity})`,
        propsForBackgroundLines: {
            strokeDasharray: '4', // dashed lines
            stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        },
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={isDark ? ['#121212', '#1E1E1E'] : ['#F5F7FA', '#FFFFFF']}
                style={StyleSheet.absoluteFillObject}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(600)}>
                    <Text style={styles.title}>Exposure History</Text>
                    <Text style={styles.subtitle}>Your sun safety journey</Text>
                </Animated.View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Loading sessions...</Text>
                    </View>
                ) : (
                    <>
                        {/* Chart Section */}
                        {chartData && chartData.durationData.some((v) => v > 0) ? (
                            <Animated.View entering={ZoomIn.duration(500)} style={styles.chartContainer}>
                                <LinearGradient
                                    colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['#FFFFFF', '#F8F9FA']}
                                    style={styles.glassBackground}
                                >
                                    <View style={styles.chartHeader}>
                                        <Text style={styles.chartTitle}>Last 7 Days</Text>
                                        <Text style={styles.chartSubtitle}>Duration (mins)</Text>
                                    </View>
                                    <BarChart
                                        data={{
                                            labels: chartData.labels,
                                            datasets: [{ data: chartData.durationData }],
                                        }}
                                        width={screenWidth - SPACING.lg * 2 - SPACING.md * 2} // Adjusted for padding
                                        height={220}
                                        yAxisLabel=""
                                        yAxisSuffix="m"
                                        chartConfig={chartConfig}
                                        style={styles.chart}
                                        fromZero
                                        showBarTops={false}
                                        showValuesOnTopOfBars={true}
                                        withInnerLines={true}
                                    />
                                </LinearGradient>
                            </Animated.View>
                        ) : (
                            <View style={styles.emptyState}>
                                <LinearGradient
                                    colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['#FFFFFF', '#F8F9FA']}
                                    style={[styles.glassBackground, { alignItems: 'center', justifyContent: 'center', minHeight: 200 }]}
                                >
                                    <Clock size={48} color={isDark ? '#555' : '#DDD'} style={{ marginBottom: SPACING.md }} />
                                    <Text style={styles.emptyStateText}>
                                        No sessions recorded yet.{'\n'}Start a timer to track your stats!
                                    </Text>
                                </LinearGradient>
                            </View>
                        )}

                        {/* Activity List */}
                        <Animated.View style={styles.sessionListContainer} entering={FadeInDown.delay(200).duration(500)}>
                            <Text style={styles.sectionTitle}>Recent Activities</Text>

                            {sessions.length === 0 ? (
                                <Text style={styles.noDataText}>No recent activity</Text>
                            ) : (
                                sessions
                                    .slice()
                                    .reverse()
                                    .slice(0, 15) // Show last 15
                                    .map((session, index) => (
                                        <Animated.View
                                            entering={FadeInRight.delay(index * 50).springify()}
                                            key={session.id}
                                            style={styles.sessionCardWrapper}
                                        >
                                            <LinearGradient
                                                colors={isDark ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)'] : ['#FFFFFF', '#F8F9FA']}
                                                style={styles.sessionCard}
                                            >
                                                <View style={styles.sessionHeaderRow}>
                                                    <View style={styles.dateContainer}>
                                                        <Calendar size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                                                        <Text style={styles.sessionDate}>
                                                            {formatFullDate(session.date)}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.uvBadge}>
                                                        <Sun size={12} color="#FFF" style={{ marginRight: 4 }} />
                                                        <Text style={styles.uvBadgeText}>UV {session.uvIndex.toFixed(1)}</Text>
                                                    </View>
                                                </View>

                                                <View style={styles.divider} />

                                                <View style={styles.sessionDetails}>
                                                    <View style={styles.detailItem}>
                                                        <Clock size={16} color={colors.primary} style={{ marginBottom: 4 }} />
                                                        <Text style={styles.detailValue}>{session.duration}m</Text>
                                                        <Text style={styles.detailLabel}>Time</Text>
                                                    </View>
                                                    <View style={styles.verticalDivider} />
                                                    <View style={styles.detailItem}>
                                                        <User size={16} color={colors.textSecondary} style={{ marginBottom: 4 }} />
                                                        <Text style={[styles.detailValue, { color: colors.textSecondary }]}>Type {session.skinType}</Text>
                                                        <Text style={styles.detailLabel}>Skin</Text>
                                                    </View>
                                                </View>
                                            </LinearGradient>
                                        </Animated.View>
                                    ))
                            )}
                        </Animated.View>
                    </>
                )}
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
        paddingBottom: moderateScale(100),
    },
    title: {
        fontSize: moderateScale(28),
        fontWeight: '800',
        color: colors.text,
        marginBottom: SPACING.xs,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: moderateScale(14),
        color: colors.textSecondary,
        marginBottom: SPACING.xl,
        fontWeight: '500',
    },
    chartContainer: {
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.xl,
        overflow: 'hidden',
        ...SHADOWS.medium,
        backgroundColor: 'transparent', // For shadow
    },
    glassBackground: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.sm,
    },
    chartTitle: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: colors.text,
    },
    chartSubtitle: {
        fontSize: moderateScale(12),
        color: colors.textSecondary,
        fontWeight: '600',
    },
    chart: {
        borderRadius: BORDER_RADIUS.lg,
        paddingRight: 0, // fix curve cut-off
        paddingBottom: 0,
    },
    emptyState: {
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.xl,
        overflow: 'hidden',
    },
    emptyStateText: {
        ...TYPOGRAPHY.body,
        textAlign: 'center',
        color: colors.textSecondary,
        lineHeight: 22,
    },
    sessionListContainer: {
        marginTop: SPACING.sm,
    },
    sectionTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        marginBottom: SPACING.md,
        color: colors.text,
        letterSpacing: 0.5,
    },
    noDataText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        textAlign: 'center',
        padding: SPACING.lg,
        fontStyle: 'italic',
    },
    sessionCardWrapper: {
        marginBottom: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        ...SHADOWS.small,
        backgroundColor: 'transparent',
    },
    sessionCard: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)',
    },
    sessionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sessionDate: {
        fontSize: moderateScale(13),
        fontWeight: '600',
        color: colors.text,
    },
    uvBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF9800', // Orange badge
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
    },
    uvBadgeText: {
        fontSize: moderateScale(11),
        fontWeight: '700',
        color: '#FFF',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: SPACING.sm,
        opacity: 0.5,
    },
    sessionDetails: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    detailItem: {
        alignItems: 'center',
        width: '40%',
    },
    verticalDivider: {
        width: 1,
        height: '80%',
        backgroundColor: colors.border,
        opacity: 0.5,
    },
    detailValue: {
        fontSize: moderateScale(16),
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 2,
    },
    detailLabel: {
        fontSize: moderateScale(11),
        color: colors.textSecondary,
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxl,
    },
    loadingText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        marginTop: SPACING.md,
    },
});
