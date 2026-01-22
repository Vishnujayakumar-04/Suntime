import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    interpolate,
    Extrapolation,
    Easing
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants/theme';
import { Sun } from 'lucide-react-native';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * SunTimer - A sun-themed circular timer with fill animation
 * Uses expo-linear-gradient instead of react-native-svg gradients
 */
const SunTimer = ({ progress = 0, size = 200, isActive = false, isDark = false }) => {
    // Animation values
    const fillHeight = useSharedValue(0);
    const pulseAnim = useSharedValue(1);
    const rotateAnim = useSharedValue(0);

    const radius = size / 2;

    // Update fill height when progress changes
    useEffect(() => {
        fillHeight.value = withTiming(progress, {
            duration: 500,
            easing: Easing.out(Easing.cubic)
        });
    }, [progress]);

    // Pulse animation for active state
    useEffect(() => {
        if (isActive) {
            pulseAnim.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1,
                true
            );
            rotateAnim.value = withRepeat(
                withTiming(360, { duration: 20000, easing: Easing.linear }),
                -1,
                false
            );
        } else {
            pulseAnim.value = withTiming(1, { duration: 300 });
        }
    }, [isActive]);

    // Fill container style (clips to circle)
    const fillStyle = useAnimatedStyle(() => {
        const heightPercent = interpolate(
            fillHeight.value,
            [0, 100],
            [0, size],
            Extrapolation.CLAMP
        );
        return {
            height: heightPercent,
        };
    });

    // Sun icon animation - REDUCED OPACITY
    const sunStyle = useAnimatedStyle(() => {
        // Reduced max opacity from 1 to 0.3 to keep text visible
        const opacity = interpolate(fillHeight.value, [0, 30], [0.1, 0.3], Extrapolation.CLAMP);
        const scale = interpolate(fillHeight.value, [0, 100], [0.9, 1.15], Extrapolation.CLAMP);
        const rotate = `${rotateAnim.value}deg`;

        return {
            opacity,
            transform: [{ scale: pulseAnim.value * scale }, { rotate }],
        };
    });

    // Completion badge animation
    const completionStyle = useAnimatedStyle(() => {
        const opacity = interpolate(fillHeight.value, [95, 100], [0, 1], Extrapolation.CLAMP);
        const scale = interpolate(fillHeight.value, [95, 100], [0.8, 1], Extrapolation.CLAMP);
        return {
            opacity,
            transform: [{ scale }],
        };
    });

    // Glow intensity based on progress
    const glowStyle = useAnimatedStyle(() => {
        const shadowOpacity = interpolate(fillHeight.value, [0, 50, 100], [0.1, 0.4, 0.8]);
        return {
            shadowOpacity,
        };
    });

    // Dynamic Colors for High Contrast
    const circleColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    const ringColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)';

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Background Circle */}
            <View style={[styles.circle, {
                width: size,
                height: size,
                borderRadius: radius,
                backgroundColor: circleColor
            }]}>

                {/* Fill Container - Animates from bottom */}
                <View style={[styles.fillContainer, { borderRadius: radius }]}>
                    <AnimatedView style={[styles.fillWrapper, fillStyle]}>
                        <LinearGradient
                            colors={['#FF4500', '#FFA500', '#FFD700']}
                            start={{ x: 0.5, y: 1 }}
                            end={{ x: 0.5, y: 0 }}
                            style={[styles.gradient, { height: size }]}
                        />
                    </AnimatedView>
                </View>

                {/* Border Ring */}
                <View style={[styles.borderRing, {
                    width: size,
                    height: size,
                    borderRadius: radius,
                    borderColor: ringColor
                }]} />
            </View>

            {/* Sun Icon */}
            <AnimatedView style={[styles.centerContent, sunStyle, glowStyle]}>
                <Sun
                    size={size * 0.35}
                    color="#FFFFFF"
                    fill={progress > 80 ? "#FFFFFF" : "rgba(255,255,255,0.3)"}
                    strokeWidth={1.5}
                />
            </AnimatedView>

            {/* Completion Badge */}
            <AnimatedView style={[styles.completionContainer, completionStyle]}>
                <View style={styles.completionBadge}>
                    <Text style={styles.completionText}>
                        Sun Session{'\n'}Completed
                    </Text>
                </View>
            </AnimatedView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    circle: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        position: 'relative',
    },
    fillContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    fillWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    borderRing: {
        position: 'absolute',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    centerContent: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 25,
        elevation: 15,
    },
    completionContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    completionBadge: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.xl,
        alignItems: 'center',
    },
    completionText: {
        ...TYPOGRAPHY.subheading,
        color: '#FFD700',
        textAlign: 'center',
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});

export default SunTimer;
