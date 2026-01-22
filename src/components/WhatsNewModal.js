import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import StandardButton from './common/StandardButton';



export default function WhatsNewModal({ visible, onClose }) {
    const { colors, isDark } = useTheme();
    const dynamicStyles = getStyles(colors, isDark);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={dynamicStyles.overlay}>
                <View style={dynamicStyles.container}>
                    {/* Header Image or Icon */}
                    <Text style={dynamicStyles.paragraph}>
                        Welcome to SUNTIME! This app helps you track safe sun exposure using your skin type, UV index, location, and protection preferences. Our goal is to support healthy Vitamin D awareness while minimizing sun damage risks. Always remember that this is an estimation tool for awareness only, not medical advice.
                    </Text>

                    <StandardButton
                        title="Get Started"
                        onPress={onClose}
                        style={{ marginTop: SPACING.xl, width: '100%' }}
                    />
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    container: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        ...SHADOWS.large,
    },
    paragraph: {
        ...TYPOGRAPHY.body,
        fontSize: moderateScale(15),
        lineHeight: 24,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    }
});
