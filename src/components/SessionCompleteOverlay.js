import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    Easing,
    FadeIn,
    FadeOut,
    interpolate,
    runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sun, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react-native';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

/**
 * SessionCompleteOverlay
 * 
 * A premium, animated full-screen overlay shown when a sun session completes.
 * Features:
 * - Fade + scale entrance animation
 * - Glowing pulsing sun icon
 * - Glassmorphism card design
 * - Gradient "Start New Session" button with pulse
 * - Confetti-like sparkle particles
 */
export default function SessionCompleteOverlay({
    visible,
    duration, // minutes completed
    onStartNew,
    onDismiss,
    colors
}) {
    // Animation values
    const overlayOpacity = useSharedValue(0);
    const cardScale = useSharedValue(0.8);
    const sunGlow = useSharedValue(1);
    const sunRotate = useSharedValue(0);
    const buttonPulse = useSharedValue(1);
    const sparkle1 = useSharedValue(0);
    const sparkle2 = useSharedValue(0);
    const sparkle3 = useSharedValue(0);
    const checkScale = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            // Fade in overlay
            overlayOpacity.value = withTiming(1, { duration: 400 });

            // Scale in card
            cardScale.value = withSpring(1, {
                damping: 12,
                stiffness: 100
            });

            // Sun glow pulsing
            sunGlow.value = withRepeat(
                withSequence(
                    withTiming(1.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Slow sun rotation
            sunRotate.value = withRepeat(
                withTiming(360, { duration: 20000, easing: Easing.linear }),
                -1,
                false
            );

            // Button subtle pulse
            buttonPulse.value = withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1,
                true
            );

            // Sparkle animations
            sparkle1.value = withDelay(200, withRepeat(
                withSequence(
                    withTiming(1, { duration: 800 }),
                    withTiming(0, { duration: 800 })
                ),
                -1,
                true
            ));

            sparkle2.value = withDelay(500, withRepeat(
                withSequence(
                    withTiming(1, { duration: 900 }),
                    withTiming(0, { duration: 900 })
                ),
                -1,
                true
            ));

            sparkle3.value = withDelay(800, withRepeat(
                withSequence(
                    withTiming(1, { duration: 700 }),
                    withTiming(0, { duration: 700 })
                ),
                -1,
                true
            ));

            // Check icon bounce in
            checkScale.value = withDelay(300, withSpring(1, { damping: 8, stiffness: 150 }));
        } else {
            overlayOpacity.value = withTiming(0, { duration: 300 });
            cardScale.value = withTiming(0.8, { duration: 200 });
            checkScale.value = 0;
        }
    }, [visible]);

    // Animated styles
    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
        pointerEvents: overlayOpacity.value > 0.5 ? 'auto' : 'none',
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
    }));

    const sunGlowStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: sunGlow.value },
            { rotate: `${sunRotate.value}deg` }
        ],
        shadowOpacity: interpolate(sunGlow.value, [1, 1.3], [0.3, 0.8]),
        shadowRadius: interpolate(sunGlow.value, [1, 1.3], [15, 40]),
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonPulse.value }],
    }));

    const sparkleStyle1 = useAnimatedStyle(() => ({
        opacity: sparkle1.value,
        transform: [{ scale: sparkle1.value }],
    }));

    const sparkleStyle2 = useAnimatedStyle(() => ({
        opacity: sparkle2.value,
        transform: [{ scale: sparkle2.value }],
    }));

    const sparkleStyle3 = useAnimatedStyle(() => ({
        opacity: sparkle3.value,
        transform: [{ scale: sparkle3.value }],
    }));

    const checkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkScale.value }],
    }));

    if (!visible) return null;

    const styles = getStyles(colors);

    return (
        <Animated.View style={[styles.overlay, overlayStyle]}>
            {/* Background gradient */}
            <LinearGradient
                colors={['rgba(0,0,0,0.85)', 'rgba(20,20,30,0.95)']}
                style={StyleSheet.absoluteFillObject}
            />

            <Animated.View style={[styles.card, cardStyle]}>
                {/* Glassmorphism card background */}
                <LinearGradient
                    colors={[
                        'rgba(255,255,255,0.15)',
                        'rgba(255,255,255,0.05)',
                    ]}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Sparkle particles */}
                    <Animated.View style={[styles.sparkle, styles.sparkle1, sparkleStyle1]}>
                        <Sparkles size={20} color="#FFD700" />
                    </Animated.View>
                    <Animated.View style={[styles.sparkle, styles.sparkle2, sparkleStyle2]}>
                        <Sparkles size={16} color="#FFA500" />
                    </Animated.View>
                    <Animated.View style={[styles.sparkle, styles.sparkle3, sparkleStyle3]}>
                        <Sparkles size={18} color="#FFEC8B" />
                    </Animated.View>

                    {/* Glowing Sun Icon */}
                    <View style={styles.sunContainer}>
                        <Animated.View style={[styles.sunGlow, sunGlowStyle]}>
                            <LinearGradient
                                colors={['#FFD93D', '#FF9800', '#FF6F00']}
                                style={styles.sunGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Sun size={60} color="#FFF" strokeWidth={1.5} />
                            </LinearGradient>
                        </Animated.View>

                        {/* Check badge */}
                        <Animated.View style={[styles.checkBadge, checkStyle]}>
                            <CheckCircle2 size={32} color="#4CAF50" fill="#E8F5E9" />
                        </Animated.View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Sun Session Completed</Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitle}>
                        Great job! You've reached your safe{'\n'}exposure limit for today.
                    </Text>

                    {/* Duration badge */}
                    <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>
                            {duration} min of sunshine ☀️
                        </Text>
                    </View>

                    {/* Start New Session Button */}
                    <Animated.View style={[styles.buttonWrapper, buttonStyle]}>
                        <TouchableOpacity
                            onPress={onStartNew}
                            activeOpacity={0.85}
                            style={styles.buttonShadow}
                        >
                            <LinearGradient
                                colors={['#FF9800', '#FF6F00', '#E65100']}
                                style={styles.button}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <RotateCcw size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Start New Session</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Dismiss hint */}
                    <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
                        <Text style={styles.dismissText}>Dismiss</Text>
                    </TouchableOpacity>
                </LinearGradient>
            </Animated.View>
        </Animated.View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    card: {
        width: width * 0.88,
        maxWidth: 380,
        borderRadius: BORDER_RADIUS.xxl,
        overflow: 'hidden',
        ...SHADOWS.large,
    },
    cardGradient: {
        paddingVertical: SPACING.xxl,
        paddingHorizontal: SPACING.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: BORDER_RADIUS.xxl,
    },
    sparkle: {
        position: 'absolute',
    },
    sparkle1: {
        top: 20,
        right: 30,
    },
    sparkle2: {
        top: 60,
        left: 25,
    },
    sparkle3: {
        bottom: 120,
        right: 20,
    },
    sunContainer: {
        position: 'relative',
        marginBottom: SPACING.lg,
    },
    sunGlow: {
        borderRadius: 100,
        shadowColor: '#FF9800',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 25,
        elevation: 15,
    },
    sunGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 2,
        ...SHADOWS.medium,
    },
    title: {
        fontSize: moderateScale(26),
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: SPACING.sm,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: moderateScale(15),
        color: 'rgba(255,255,255,0.75)',
        textAlign: 'center',
        lineHeight: moderateScale(22),
        marginBottom: SPACING.lg,
    },
    durationBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    durationText: {
        fontSize: moderateScale(14),
        color: '#FFD93D',
        fontWeight: '600',
    },
    buttonWrapper: {
        width: '100%',
        marginBottom: SPACING.md,
    },
    buttonShadow: {
        borderRadius: BORDER_RADIUS.xl,
        shadowColor: '#FF6F00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md + 4,
        paddingHorizontal: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
    },
    buttonText: {
        fontSize: moderateScale(17),
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    dismissButton: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
    },
    dismissText: {
        fontSize: moderateScale(14),
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
    },
});
