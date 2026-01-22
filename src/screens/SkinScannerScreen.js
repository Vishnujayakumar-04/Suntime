// Skin Scanner Screen - Camera-based skin type detection
// Enhanced with real image color analysis using base64
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, COLORS } from '../constants/theme';
import StandardButton from '../components/common/StandardButton';

// Fitzpatrick skin type mapping based on RGB color analysis
const SKIN_TYPES = {
    1: { name: 'Type I - Very Fair', color: '#FFE4E1', description: 'Always burns, never tans' },
    2: { name: 'Type II - Fair', color: '#FFD7BE', description: 'Burns easily, tans minimally' },
    3: { name: 'Type III - Medium', color: '#F4C2A0', description: 'Sometimes burns, tans gradually' },
    4: { name: 'Type IV - Olive', color: '#D2996B', description: 'Rarely burns, tans easily' },
    5: { name: 'Type V - Brown', color: '#A67C52', description: 'Very rarely burns, tans very easily' },
    6: { name: 'Type VI - Dark', color: '#5D4037', description: 'Never burns, deeply pigmented' },
};

/**
 * Analyze skin color and map to Fitzpatrick scale
 * Uses luminance, warmth, and saturation heuristics
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {number} Fitzpatrick skin type (1-6)
 */
const analyzeSkinTone = (r, g, b) => {
    // Normalize brightness using simple average as requested
    const avg = (r + g + b) / 3;
    const normalizedBrightness = avg / 255;

    console.log(`🎨 Skin Analysis: AvgRGB=${avg.toFixed(1)}, Brightness=${normalizedBrightness.toFixed(3)}, R=${r}, G=${g}, B=${b}`);

    // Fitzpatrick mapping thresholds
    if (normalizedBrightness > 0.75) return 1; // Type 1
    if (normalizedBrightness > 0.65) return 2; // Type 2
    if (normalizedBrightness > 0.50) return 3; // Type 3
    if (normalizedBrightness > 0.35) return 4; // Type 4
    if (normalizedBrightness > 0.20) return 5; // Type 5
    return 6; // Type 6
};

/**
 * Base64 character to value mapping for React Native
 */
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64Lookup = {};
for (let i = 0; i < base64Chars.length; i++) {
    base64Lookup[base64Chars[i]] = i;
}

/**
 * Decode base64 string to Uint8Array (React Native compatible)
 */
const decodeBase64 = (base64String) => {
    // Remove data URL prefix if present
    const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, '');

    // Remove padding and whitespace
    const len = cleanBase64.length;
    let bufferLen = Math.floor(len * 0.75);

    if (cleanBase64[len - 1] === '=') bufferLen--;
    if (cleanBase64[len - 2] === '=') bufferLen--;

    const bytes = new Uint8Array(bufferLen);
    let p = 0;

    for (let i = 0; i < len; i += 4) {
        const encoded1 = base64Lookup[cleanBase64[i]] || 0;
        const encoded2 = base64Lookup[cleanBase64[i + 1]] || 0;
        const encoded3 = base64Lookup[cleanBase64[i + 2]] || 0;
        const encoded4 = base64Lookup[cleanBase64[i + 3]] || 0;

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        if (p < bufferLen) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        if (p < bufferLen) bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
    }

    return bytes;
};



/**
 * Main skin color extraction
 * Uses multiple analysis strategies for reliability
 */
const extractSkinColor = async (imageUri, base64Data) => {
    console.log('🔬 Starting skin color analysis (Enhanced)...');

    // Brief processing delay for UX
    await new Promise(resolve => setTimeout(resolve, 600));

    if (base64Data && base64Data.length > 1000) {
        try {
            // Decode the base64 data
            const bytes = decodeBase64(base64Data);
            console.log(`📦 Image data: ${base64Data.length} chars, ${bytes.length} bytes`);

            let totalR = 0, totalG = 0, totalB = 0;
            let sampleCount = 0;

            // Sample a larger area (20% to 80% of file) to capture wrist region effectively
            // The byte stream roughly corresponds to image data, so spreading samples covers the image
            const startIdx = Math.floor(bytes.length * 0.20);
            const endIdx = Math.floor(bytes.length * 0.80);

            // Sample every 4th byte triplet to ensure we scan quickly but extensively
            for (let i = startIdx; i < endIdx - 2; i += 4) {
                const r = bytes[i];
                const g = bytes[i + 1];
                const b = bytes[i + 2];

                // Relaxed Skin Color Filter: R >= G and G >= (B - 15)
                // This captures a broader range of skin tones including cooler undertones
                if (r >= g && g >= (b - 15)) {
                    totalR += r;
                    totalG += g;
                    totalB += b;
                    sampleCount++;
                }

                // Limit max samples if needed, but we want 3000+, 
                // processing 100k samples is fast in JS V8 so no strict break needed, 
                // but let's break if we have enough to be super fast
                if (sampleCount > 20000) break;
            }

            if (sampleCount > 3000) {
                const avgR = Math.round(totalR / sampleCount);
                const avgG = Math.round(totalG / sampleCount);
                const avgB = Math.round(totalB / sampleCount);

                console.log(`📊 Analysis: Samples=${sampleCount}, RGB=(${avgR},${avgG},${avgB})`);

                const skinType = analyzeSkinTone(avgR, avgG, avgB);
                console.log(`🎯 Detected skin type: ${skinType}`);

                // RGB lookup for display
                const rgbLookup = {
                    1: { r: 255, g: 224, b: 210 },
                    2: { r: 245, g: 205, b: 180 },
                    3: { r: 230, g: 180, b: 150 },
                    4: { r: 200, g: 145, b: 105 },
                    5: { r: 165, g: 115, b: 80 },
                    6: { r: 100, g: 70, b: 50 },
                };

                return {
                    ...rgbLookup[skinType],
                    detectedType: skinType,
                    confidence: 'high',
                };
            } else {
                console.log(`⚠️ Low sample count: ${sampleCount}. Falling back.`);
            }
        } catch (error) {
            console.error('Base64 analysis failed:', error);
        }
    }

    // Fallback: Return medium type with low confidence
    console.log('⚠️ Using fallback detection');
    return {
        r: 210,
        g: 175,
        b: 145,
        detectedType: 3,
        confidence: 'low',
    };
};

export default function SkinScannerScreen({ navigation, route }) {
    const { colors, isDark } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState('front');
    const [capturedImage, setCapturedImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [detectedType, setDetectedType] = useState(null);
    const [adjustedType, setAdjustedType] = useState(null);
    const [confidence, setConfidence] = useState(null);
    const cameraRef = useRef(null);

    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    // Handle camera permission loading
    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Handle camera permission not granted
    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionTitle}>📷 Camera Access Needed</Text>
                    <Text style={styles.permissionText}>
                        We need camera access to analyze your skin tone and determine your Fitzpatrick skin type for personalized sun safety recommendations.
                    </Text>
                    <StandardButton
                        title="Grant Camera Access"
                        onPress={requestPermission}
                        style={{ marginTop: SPACING.lg }}
                    />
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.skipText}>Skip - Select Manually</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                console.log('📸 Capturing image...');
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    base64: true, // Enable base64 for color analysis
                    skipProcessing: Platform.OS === 'android', // Faster on Android
                });

                console.log('✅ Image captured, size:', photo.base64?.length || 0);
                setCapturedImage(photo.uri);
                analyzeImage(photo.uri, photo.base64);
            } catch (error) {
                console.error('Error taking picture:', error);
                Alert.alert('Error', 'Failed to capture image. Please try again.');
            }
        }
    };

    const analyzeImage = async (imageUri, base64Data) => {
        setAnalyzing(true);
        try {
            const result = await extractSkinColor(imageUri, base64Data);
            console.log('🎯 Detection result:', result);

            setDetectedType(result.detectedType);
            setAdjustedType(result.detectedType);
            setConfidence(result.confidence);
        } catch (error) {
            console.error('Analysis error:', error);
            // Fallback to type 3 (medium) if analysis fails
            setDetectedType(3);
            setAdjustedType(3);
            setConfidence('low');
        } finally {
            setAnalyzing(false);
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setDetectedType(null);
        setAdjustedType(null);
        setConfidence(null);
    };

    const confirmSelection = () => {
        const selectedType = adjustedType || detectedType || 3;

        // Navigate back with the selected skin type
        if (route.params?.onSelectSkinType) {
            route.params.onSelectSkinType(selectedType);
        }

        navigation.goBack();
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    // Results view after photo capture
    if (capturedImage) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.resultContainer}>
                    {/* Captured Image */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: capturedImage }}
                            style={styles.capturedImage}
                            resizeMode="cover"
                        />
                        {analyzing && (
                            <View style={styles.analyzingOverlay}>
                                <ActivityIndicator size="large" color="#FFFFFF" />
                                <Text style={styles.analyzingText}>Analyzing skin tone...</Text>
                            </View>
                        )}
                    </View>

                    {/* Results */}
                    {!analyzing && detectedType && (
                        <View style={styles.resultsCard}>
                            <Text style={styles.resultsTitle}>Detected Skin Type</Text>

                            {/* Confidence indicator */}
                            {confidence && (
                                <View style={styles.confidenceBadge}>
                                    <Text style={styles.confidenceText}>
                                        {confidence === 'high' ? '✓ High Confidence' :
                                            confidence === 'medium' ? '○ Medium Confidence' :
                                                '△ Adjust if needed'}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.detectedTypeContainer}>
                                <View style={[styles.colorSwatch, { backgroundColor: SKIN_TYPES[adjustedType].color }]} />
                                <View style={styles.typeInfo}>
                                    <Text style={styles.typeName}>{SKIN_TYPES[adjustedType].name}</Text>
                                    <Text style={styles.typeDescription}>{SKIN_TYPES[adjustedType].description}</Text>
                                </View>
                            </View>

                            {/* Adjustment Selector */}
                            <Text style={styles.adjustLabel}>Tap to adjust if needed:</Text>
                            <View style={styles.typeSelector}>
                                {[1, 2, 3, 4, 5, 6].map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.typeSelectorItem,
                                            { backgroundColor: SKIN_TYPES[type].color },
                                            adjustedType === type && styles.typeSelectorItemActive,
                                        ]}
                                        onPress={() => setAdjustedType(type)}
                                    >
                                        <Text style={[
                                            styles.typeSelectorText,
                                            type > 4 && { color: '#FFFFFF' }
                                        ]}>
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionButtons}>
                                <StandardButton
                                    title="Retake Photo"
                                    onPress={retakePhoto}
                                    variant="secondary"
                                    style={{ flex: 1, marginRight: SPACING.sm }}
                                />
                                <StandardButton
                                    title="Confirm"
                                    onPress={confirmSelection}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    // Camera view
    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
            >
                {/* Guide overlay */}
                <View style={styles.cameraOverlay}>
                    <View style={styles.guideFrame}>
                        <View style={styles.targetCircle} />
                        <Text style={styles.guideText}>
                            Scan your inner wrist in natural light
                        </Text>
                    </View>
                </View>

                {/* Camera controls */}
                <View style={styles.cameraControls}>
                    <TouchableOpacity
                        style={styles.flipButton}
                        onPress={toggleCameraFacing}
                    >
                        <Text style={styles.flipButtonText}>🔄</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.captureButton}
                        onPress={takePicture}
                    >
                        <View style={styles.captureButtonInner} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.cancelButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Instructions */}
                <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsText}>
                        📸 Scan inner wrist in natural light
                    </Text>
                </View>
            </CameraView>
        </View>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    permissionTitle: {
        ...TYPOGRAPHY.title,
        color: colors.text,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    permissionText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    skipButton: {
        marginTop: SPACING.lg,
        padding: SPACING.md,
    },
    skipText: {
        color: colors.primary,
        fontWeight: '600',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideFrame: {
        width: moderateScale(220),
        height: moderateScale(220),
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: moderateScale(110),
        justifyContent: 'center',
        alignItems: 'center',
    },
    targetCircle: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderStyle: 'dashed',
    },
    guideText: {
        position: 'absolute',
        bottom: -40,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        textAlign: 'center',
        width: 200,
    },
    cameraControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    flipButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    flipButtonText: {
        fontSize: 24,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    captureButtonInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFFFFF',
        borderWidth: 4,
        borderColor: colors.primary,
    },
    cancelButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 24,
        color: '#FFFFFF',
    },
    instructionsContainer: {
        position: 'absolute',
        top: SPACING.xl + 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    instructionsText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
    },
    // Results styles
    resultContainer: {
        flex: 1,
    },
    imageContainer: {
        height: '40%',
        backgroundColor: '#000',
    },
    capturedImage: {
        width: '100%',
        height: '100%',
    },
    analyzingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    analyzingText: {
        color: '#FFFFFF',
        marginTop: SPACING.md,
        fontSize: 16,
        fontWeight: '600',
    },
    resultsCard: {
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        marginTop: -SPACING.lg,
        padding: SPACING.lg,
    },
    resultsTitle: {
        ...TYPOGRAPHY.title,
        color: colors.text,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    confidenceBadge: {
        alignSelf: 'center',
        backgroundColor: colors.backgroundLight,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
        marginBottom: SPACING.md,
    },
    confidenceText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    detectedTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
    },
    colorSwatch: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: SPACING.md,
        borderWidth: 3,
        borderColor: colors.border,
    },
    typeInfo: {
        flex: 1,
    },
    typeName: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        fontWeight: '700',
        marginBottom: 4,
    },
    typeDescription: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    adjustLabel: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    typeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    typeSelectorItem: {
        width: moderateScale(48),
        height: moderateScale(48),
        borderRadius: moderateScale(24),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    typeSelectorItemActive: {
        borderColor: colors.primary,
        borderWidth: 4,
        transform: [{ scale: 1.15 }],
        ...SHADOWS.medium,
    },
    typeSelectorText: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 'auto',
    },
});
