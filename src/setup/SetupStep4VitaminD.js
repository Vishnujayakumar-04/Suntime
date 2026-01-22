import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GLASS } from '../constants/theme';
import { Activity, Camera, FileText, Info, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import StandardButton from '../components/common/StandardButton';
import { saveUserToFirestore } from '../services/firestore';

export default function SetupStep4VitaminD({ navigation }) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [vitaminDValue, setVitaminDValue] = useState('');
    const [saving, setSaving] = useState(false);

    // badge logic
    const getStatus = (val) => {
        if (!val) return null;
        const num = parseFloat(val);
        if (isNaN(num)) return null;

        if (num < 20) return { label: 'Deficient', color: '#F44336', icon: AlertTriangle };
        if (num < 30) return { label: 'Insufficient', color: '#FF9800', icon: Info };
        if (num <= 100) return { label: 'Sufficient', color: '#4CAF50', icon: CheckCircle };
        return { label: 'Toxicity Risk', color: '#F44336', icon: AlertTriangle };
    };

    const status = getStatus(vitaminDValue);
    const StatusIcon = status?.icon;

    const handleNext = async () => {
        // Validation: Just ensure it's a valid number if entered
        // Allow empty? User request implies "Input Field", maybe optional? 
        // Logic says "Allow users to verify...". If they don't have it, they might skip?
        // But requested flow includes it as a Step.
        // Let's assume input is NOT mandatory to proceed, OR allow "Skip" / "I don't know"?
        // Detailed Requirements didn't specify "Skip".
        // But "Setup wizard" usually implies mandatory or explicitly skipped steps.
        // I will allow empty (skip) implicitly or explicit.
        // Actually, let's treat it as: If entered -> save. If not -> proceed (value null).

        setSaving(true);
        try {
            const level = vitaminDValue ? parseFloat(vitaminDValue) : null;

            if (user && level !== null) {
                // Save to firestore
                await saveUserToFirestore(user.uid, {
                    vitaminDLevel: level,
                    vitaminDLastCheck: new Date().toISOString()
                });
            }

            // Proceed to Step 5 (Disclaimer)
            navigation.navigate('SetupStep5');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save data. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDummyAction = () => {
        Alert.alert('Coming Soon', 'This feature is under development.');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Progress */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: '80%' }]} />
                        </View>
                        <Text style={styles.progressText}>Step 4 of 5</Text>
                    </View>

                    {/* Header */}
                    <Animated.View entering={FadeInDown} style={styles.header}>
                        <Activity color={colors.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
                        <Text style={styles.title}>Vitamin D Report</Text>
                        <Text style={styles.subtitle}>
                            Verify your actual levels to fine-tune suggestions
                        </Text>
                    </Animated.View>

                    {/* Input Card */}
                    <View style={styles.card}>
                        <View style={styles.helperBox}>
                            <Info size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={styles.helperText}>
                                Ask your lab for a <Text style={{ fontWeight: 'bold' }}>25-Hydroxy Vitamin D</Text> test. Standard blood tests do not measure this.
                            </Text>
                        </View>

                        <Text style={styles.label}>Enter Result (ng/mL)</Text>
                        <TextInput
                            style={styles.input}
                            value={vitaminDValue}
                            onChangeText={setVitaminDValue}
                            placeholder="e.g. 35"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            maxLength={5}
                        />

                        {/* Real-time Feedback Badge */}
                        {status && (
                            <Animated.View entering={FadeInDown} style={[styles.badge, { backgroundColor: status.color + '20', borderColor: status.color }]}>
                                <StatusIcon size={18} color={status.color} style={{ marginRight: 8 }} />
                                <Text style={[styles.badgeText, { color: status.color }]}>
                                    {status.label}
                                </Text>
                            </Animated.View>
                        )}
                    </View>

                    {/* Dummy Buttons */}
                    <View style={styles.dummyContainer}>
                        <TouchableOpacity style={styles.dummyButton} onPress={handleDummyAction}>
                            <Camera size={20} color={colors.textSecondary} style={{ marginBottom: 4 }} />
                            <Text style={styles.dummyText}>Scan Report</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.dummyButton} onPress={handleDummyAction}>
                            <FileText size={20} color={colors.textSecondary} style={{ marginBottom: 4 }} />
                            <Text style={styles.dummyText}>Upload File</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }} />

                    <StandardButton
                        title={vitaminDValue ? "Next" : "Skip for Now"}
                        onPress={handleNext}
                        loading={saving}
                        disabled={saving}
                        variant={vitaminDValue ? 'primary' : 'secondary'}
                        style={{ marginTop: SPACING.xl }}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingBottom: SPACING.xxl,
        flexGrow: 1,
    },
    progressContainer: {
        marginBottom: SPACING.xl,
    },
    progressBar: {
        height: moderateScale(6),
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    progressText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    title: {
        ...TYPOGRAPHY.title,
        color: colors.text,
        textAlign: 'center',
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.xs,
    },
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.medium,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    helperBox: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.lg,
        alignItems: 'flex-start',
    },
    helperText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        flex: 1,
        lineHeight: 18,
    },
    label: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        marginBottom: SPACING.sm,
        fontWeight: '600',
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        fontSize: moderateScale(18),
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
    },
    badgeText: {
        ...TYPOGRAPHY.subheading,
        fontWeight: 'bold',
    },
    dummyContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    dummyButton: {
        flex: 1,
        backgroundColor: colors.cardBackground,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    dummyText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
    }
});
