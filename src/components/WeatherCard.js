import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Cloud, MapPin, Sun, Thermometer } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, GLASS, moderateScale } from '../constants/theme';

export default function WeatherCard({ weatherData, loading }) {
    const { colors, isDark } = useTheme();
    const dynamicStyles = getStyles(colors, isDark);

    if (loading || !weatherData) {
        return (
            <View style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center', height: 100 }]}>
                <Text style={dynamicStyles.loadingText}>Loading Weather...</Text>
            </View>
        );
    }

    const { city, temperature, condition, uvIndex, windSpeed, humidity } = weatherData;

    return (
        <View style={dynamicStyles.container}>
            <View style={dynamicStyles.topRow}>
                {/* Location & Condition */}
                <View>
                    <View style={dynamicStyles.locationRow}>
                        <MapPin size={18} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={dynamicStyles.city}>{city || 'Unknown Location'}</Text>
                    </View>
                    <Text style={dynamicStyles.condition}>{condition || 'Clear Sky'}</Text>
                </View>

                {/* Temperature */}
                <View style={dynamicStyles.tempContainer}>
                    <Text style={dynamicStyles.temperature}>{Math.round(temperature)}°</Text>
                </View>
            </View>

            <View style={dynamicStyles.divider} />

            {/* Extended Stats (Wind, Humidity, UV) */}
            <View style={dynamicStyles.statsRow}>
                {/* Wind */}
                <View style={dynamicStyles.statItem}>
                    <Cloud size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={dynamicStyles.statText}>{windSpeed ? `${Math.round(windSpeed)} km/h` : '--'}</Text>
                    <Text style={dynamicStyles.statLabel}>Wind</Text>
                </View>

                {/* Humidity */}
                <View style={[dynamicStyles.statItem, styles.borderLeft]}>
                    <Thermometer size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={dynamicStyles.statText}>{humidity ? `${Math.round(humidity)}%` : '--'}</Text>
                    <Text style={dynamicStyles.statLabel}>Hum</Text>
                </View>

                {/* UV (Keep for completeness, though main UI has a big card) */}
                <View style={[dynamicStyles.statItem, styles.borderLeft]}>
                    <Sun size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={dynamicStyles.statText}>{Math.round(uvIndex)}</Text>
                    <Text style={dynamicStyles.statLabel}>UV</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    borderLeft: {
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(0,0,0,0.05)',
        paddingLeft: 12,
        marginLeft: 12
    }
});

const getStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: colors.border,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    city: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
        color: colors.text,
    },
    condition: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginLeft: 20
    },
    tempContainer: {
        backgroundColor: colors.background,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
    },
    temperature: {
        ...TYPOGRAPHY.heading,
        fontSize: moderateScale(24),
        color: colors.text,
    },
    loadingText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: SPACING.sm,
        opacity: 0.5
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        ...TYPOGRAPHY.caption,
        fontWeight: '700',
        color: colors.text,
        marginRight: 4
    },
    statLabel: {
        ...TYPOGRAPHY.small,
        color: colors.textSecondary,
    },
    // Rename row to topRow for clarity/match
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    }
});
