import React from 'react';
import { Text, StyleSheet, View, ActivityIndicator, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, moderateScale } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Animated Button Component
 * Features:
 * - Scale down on press
 * - Smooth spring bounce effect
 * - Opacity fade on press
 * 
 * Height: 50px (Standard touch target)
 */
export default function StandardButton({
    title,
    onPress,
    variant = 'primary', // primary, secondary, outline, ghost, danger
    size = 'md', // sm, md, lg
    disabled = false,
    loading = false,
    icon = null,
    style,
    textStyle,
    ...props
}) {
    const { colors } = useTheme();

    // Animation values
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const getBackgroundColor = () => {
        if (disabled) return colors.textLight;
        switch (variant) {
            case 'primary': return colors.primary;
            case 'secondary': return colors.secondary || '#333';
            case 'danger': return colors.danger || '#FF0000';
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            default: return colors.primary;
        }
    };

    const getBorderColor = () => {
        if (disabled) return 'transparent';
        if (variant === 'outline') return colors.primary;
        return 'transparent';
    };

    const getTextColor = () => {
        if (disabled) return colors.background;
        if (variant === 'outline') return colors.primary;
        if (variant === 'ghost') return colors.primary;
        return colors.white;
    };

    const getHeight = () => {
        switch (size) {
            case 'sm': return moderateScale(36);
            case 'md': return moderateScale(50);
            case 'lg': return moderateScale(60);
            default: return moderateScale(50);
        }
    };

    // Animated style for press effect
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.95, {
            damping: 15,
            stiffness: 400,
        });
        opacity.value = withTiming(0.9, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, {
            damping: 15,
            stiffness: 400,
        });
        opacity.value = withTiming(1, { duration: 100 });
    };

    const containerStyles = [
        styles.button,
        {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: variant === 'outline' ? 2 : 0,
            height: getHeight(),
            opacity: disabled && variant !== 'outline' ? 0.6 : 1,
        },
        variant === 'primary' && SHADOWS.button,
        style,
    ];

    return (
        <AnimatedPressable
            style={[containerStyles, animatedStyle]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} size="small" />
            ) : (
                <View style={styles.contentContainer}>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
                    <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                        {title}
                    </Text>
                </View>
            )}
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        width: '100%',
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginRight: SPACING.sm,
    },
    text: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        textAlign: 'center',
    },
});
