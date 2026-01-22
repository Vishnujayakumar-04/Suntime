import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';

import { X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import StandardButton from './common/StandardButton';

const FAQ_DATA = [
    {
        question: "What is Suntime?",
        answer: "Suntime is a sun exposure awareness app that helps users track safe sunlight exposure using UV Index, skin type, and exposure time."
    },
    {
        question: "How does it work?",
        answer: "It uses UV Index, skin type, time, sunscreen, and cloud data to estimate safe sun exposure."
    },
    {
        question: "Benefits",
        answer: "• Avoid overexposure\n• Improve Vitamin D habits\n• Build healthy sun routines"
    },
    {
        question: "Key Features",
        answer: "• UV tracking\n• Safe timer\n• Exposure score\n• Progress tracking\n• Educational content"
    }
];

const FAQItem = ({ item, isOpen, onPress, colors }) => (
    <TouchableOpacity
        style={[styles.faqItem, { backgroundColor: colors.backgroundLight }]}
        onPress={onPress}
        activeOpacity={0.8}
    >
        <View style={styles.questionRow}>
            <Text style={[styles.question, { color: colors.text }]}>{item.question}</Text>
            {isOpen ? (
                <ChevronUp size={20} color={colors.primary} />
            ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
            )}
        </View>
        {isOpen && (
            <Text style={[styles.answer, { color: colors.textSecondary }]}>
                {item.answer}
            </Text>
        )}
    </TouchableOpacity>
);

export default function FAQModal({ visible, onClose }) {
    const { colors, isDark } = useTheme();
    const [openIndex, setOpenIndex] = React.useState(0);

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
                            <HelpCircle size={24} color={colors.primary} style={{ marginRight: 10 }} />
                            <Text style={dynamicStyles.title}>Frequently Asked Questions</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={dynamicStyles.closeBtn}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={dynamicStyles.content}>
                        {FAQ_DATA.map((item, index) => (
                            <FAQItem
                                key={index}
                                item={item}
                                isOpen={index === openIndex}
                                onPress={() => setOpenIndex(index === openIndex ? null : index)}
                                colors={colors}
                            />
                        ))}
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
        maxHeight: '80%',
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
    },
    footer: {
        padding: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    faqItem: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
    },
    questionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    question: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        fontSize: moderateScale(15),
        flex: 1,
        marginRight: SPACING.sm,
    },
    answer: {
        ...TYPOGRAPHY.body,
        marginTop: SPACING.md,
        lineHeight: 22,
    }
});
