import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { X, Info, Shield, Activity, Sun, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import StandardButton from './common/StandardButton';

export default function AboutModal({ visible, onClose }) {
    const { colors, isDark } = useTheme();
    const dynamicStyles = getStyles(colors, isDark);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={dynamicStyles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={dynamicStyles.backdrop} />
                </TouchableWithoutFeedback>

                <View style={dynamicStyles.modalContainer}>
                    <View style={dynamicStyles.header}>
                        <View style={dynamicStyles.titleRow}>
                            <Info size={24} color={colors.primary} style={{ marginRight: 10 }} />
                            <Text style={dynamicStyles.title}>About Suntime</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={dynamicStyles.closeBtn}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={dynamicStyles.content} showsVerticalScrollIndicator={false}>

                        {/* App Description */}
                        <Text style={dynamicStyles.sectionHeader}>App Description</Text>
                        <Text style={dynamicStyles.paragraph}>
                            SUNTIME helps users track safe sun exposure using UV Index, skin type, location, and exposure duration.
                        </Text>

                        {/* Key Features */}
                        <Text style={dynamicStyles.sectionHeader}>Key Features</Text>
                        <View style={dynamicStyles.featureList}>
                            {[
                                "UV Index tracking",
                                "Skin type personalization",
                                "Exposure timer",
                                "Firebase sync",
                                "Weather + location",
                                "Exposure score"
                            ].map((feature, index) => (
                                <View key={index} style={dynamicStyles.featureItem}>
                                    <CheckCircle size={16} color={colors.success} style={{ marginRight: 8 }} />
                                    <Text style={dynamicStyles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Scientific Validation */}
                        <Text style={dynamicStyles.sectionHeader}>Scientific Validation</Text>

                        <View style={dynamicStyles.scienceCard}>
                            <Text style={dynamicStyles.scienceTitle}>UV Index is a WHO Standard</Text>
                            <Text style={dynamicStyles.scienceText}>Developed by the World Health Organization to measure UV radiation intensity.</Text>
                        </View>

                        <View style={dynamicStyles.scienceCard}>
                            <Text style={dynamicStyles.scienceTitle}>UV Exposure = Intensity × Time</Text>
                            <Text style={dynamicStyles.scienceText}>UV Dose = UV Index × Exposure Time</Text>
                        </View>

                        <View style={dynamicStyles.scienceCard}>
                            <Text style={dynamicStyles.scienceTitle}>Skin Type Affects UV Sensitivity</Text>
                            <Text style={dynamicStyles.scienceText}>Fitzpatrick Skin Scale estimates burn risk.</Text>
                        </View>

                        <View style={dynamicStyles.scienceCard}>
                            <Text style={dynamicStyles.scienceTitle}>Protection Factors Reduce UV Impact</Text>
                            <Text style={dynamicStyles.scienceText}>Sunscreen and cloud cover reduce UV radiation.</Text>
                        </View>

                        <View style={dynamicStyles.scienceCard}>
                            <Text style={dynamicStyles.scienceTitle}>Public Health Uses Similar Models</Text>
                            <Text style={dynamicStyles.scienceText}>WHO and EPA use UV Index + time + skin type for sun safety.</Text>
                        </View>

                        {/* Justification Paragraph */}
                        <Text style={dynamicStyles.sectionHeader}>Justification</Text>
                        <View style={dynamicStyles.justificationBox}>
                            <Text style={dynamicStyles.justificationText}>
                                The SUNTIME application estimates ultraviolet (UV) exposure using scientifically accepted parameters such as the UV Index, exposure duration, skin type classification, and environmental protection factors. The UV Index is a globally recognized standard developed by the World Health Organization to represent UV radiation intensity. UV exposure is commonly calculated using the relationship between radiation intensity and time. Additionally, dermatological research confirms that skin sensitivity varies across Fitzpatrick Skin Types, which influences safe exposure limits. By combining these validated factors, SUNTIME provides an evidence-based estimation of UV exposure for awareness and sun safety guidance. The application does not perform medical diagnosis but offers scientifically aligned preventive insights.
                            </Text>
                        </View>

                        {/* Disclaimer */}
                        <View style={dynamicStyles.disclaimerBox}>
                            <Shield size={20} color={colors.warning} style={{ marginBottom: 8 }} />
                            <Text style={dynamicStyles.disclaimerText}>
                                “This is an estimation for awareness only, not medical advice.”
                            </Text>
                        </View>

                    </ScrollView>

                    <View style={dynamicStyles.footer}>
                        <StandardButton title="Close" onPress={onClose} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: 'rgba(0,0,0,0.6)'
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: '100%',
        height: '85%',
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        ...SHADOWS.large,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        ...TYPOGRAPHY.heading,
        fontSize: moderateScale(18),
        color: colors.text,
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    footer: {
        padding: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    sectionHeader: {
        ...TYPOGRAPHY.subheading,
        fontWeight: 'bold',
        color: colors.primary,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontSize: moderateScale(14)
    },
    paragraph: {
        ...TYPOGRAPHY.body,
        color: colors.text,
        lineHeight: 22,
    },
    featureList: {
        marginBottom: SPACING.sm,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    featureText: {
        ...TYPOGRAPHY.body,
        color: colors.text,
    },
    scienceCard: {
        backgroundColor: colors.background,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    scienceTitle: {
        ...TYPOGRAPHY.body,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    scienceText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    justificationBox: {
        backgroundColor: colors.backgroundLight,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.lg,
    },
    justificationText: {
        ...TYPOGRAPHY.caption,
        color: colors.text,
        lineHeight: 20,
        textAlign: 'justify'
    },
    disclaimerBox: {
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: colors.background,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: colors.warning,
        marginTop: SPACING.md,
    },
    disclaimerText: {
        ...TYPOGRAPHY.body,
        fontWeight: 'bold',
        color: colors.warning,
        textAlign: 'center',
        fontStyle: 'italic',
    }
});
