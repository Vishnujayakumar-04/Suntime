import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
    useSharedValue,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    useAnimatedStyle,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const FloatingParticle = ({ size, initialX, initialY, duration, delay }) => {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.6, { duration: duration / 2, easing: Easing.sin }),
                withTiming(0, { duration: duration / 2, easing: Easing.sin })
            ),
            -1,
            true
        );

        translateY.value = withRepeat(
            withTiming(-100, { duration: duration, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[{ position: 'absolute', left: initialX, top: initialY }, style]}>
            <Svg height={size} width={size}>
                <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={COLORS.primaryLight} opacity={0.5} />
            </Svg>
        </Animated.View>
    );
};

const AnimatedBackground = ({ children }) => {
    const { isDark, colors } = useTheme();
    const sunY = useSharedValue(0);

    useEffect(() => {
        sunY.value = withRepeat(
            withSequence(
                withTiming(20, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
                withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );
    }, []);

    const sunStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: sunY.value }],
    }));

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                    <Defs>
                        <RadialGradient id="grad" cx="100%" cy="0%" r="100%" gradientUnits="userSpaceOnUse">
                            <Stop offset="0" stopColor={isDark ? '#FF6D00' : '#FFAB40'} stopOpacity="0.15" />
                            <Stop offset="1" stopColor={colors.background} stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <AnimatedCircle
                        cx="100%"
                        cy="0%"
                        r={width * 1.2}
                        fill="url(#grad)"
                    />
                </Svg>
            </View>

            <Animated.View style={[styles.sunOrb, sunStyle]}>
                <Svg height={200} width={200}>
                    <Defs>
                        <RadialGradient id="sunGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                            <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.2" />
                            <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Circle cx="100" cy="100" r="80" fill="url(#sunGlow)" />
                    <Circle cx="100" cy="100" r="40" fill={COLORS.primaryLight} opacity={0.3} />
                </Svg>
            </Animated.View>

            <FloatingParticle size={10} initialX={width * 0.2} initialY={height * 0.8} duration={8000} delay={0} />
            <FloatingParticle size={15} initialX={width * 0.7} initialY={height * 0.6} duration={12000} delay={2000} />
            <FloatingParticle size={8} initialX={width * 0.5} initialY={height * 0.9} duration={10000} delay={4000} />

            <View style={{ flex: 1, zIndex: 1 }}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sunOrb: {
        position: 'absolute',
        top: -50,
        right: -50,
        opacity: 0.8,
    }
});

export default AnimatedBackground;
