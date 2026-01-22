import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    Modal,
    TextInput,
    TouchableWithoutFeedback,
    Keyboard,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS, COLORS } from '../constants/theme';
import {
    User, Mail, Shield, Sun, Camera, MoreVertical,
    ChevronRight, Activity, Clock,
    Lock, Info, MapPin, Edit3, Check, X, AlertTriangle, CheckCircle // Updated imports
} from 'lucide-react-native';
import { getUsername, updateUsername } from '../utils/auth';
import { getUserSettings, getManualUV, setManualUV } from '../utils/storage';
import { fetchUserData, saveUserToFirestore, getSessionStats } from '../services/firestore';
import { uploadProfileImage } from '../services/storage';
import { auth } from '../config/firebase';
import MenuDrawer from '../components/MenuDrawer';
import StandardButton from '../components/common/StandardButton';

export default function ProfileScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const { signOut } = useAuth();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    // User Data
    const [username, setUsername] = useState('User');
    const [email, setEmail] = useState('user@example.com');
    const [profileImage, setProfileImageState] = useState(null);
    const [skinType, setSkinType] = useState(null);
    const [manualUV, setManualUVState] = useState(null);
    const [vitaminDLevel, setVitaminDLevel] = useState(null); // New State

    // Stats
    const [stats, setStats] = useState({
        totalSessions: 0,
        totalMinutes: 0,
        currentStreak: 0
    });

    // UI State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Modals
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isUVModalVisible, setIsUVModalVisible] = useState(false);
    const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
    const [isVitDModalVisible, setIsVitDModalVisible] = useState(false); // New
    const [newName, setNewName] = useState('');
    const [uvInputValue, setUVInputValue] = useState('');
    const [vitDInputValue, setVitDInputValue] = useState(''); // New
    const [pendingImage, setPendingImage] = useState(null); // Image selected but not yet uploaded
    const [isUploading, setIsUploading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setIsLoading(true);

            // Load local prefs
            const uv = await getManualUV();
            setManualUVState(uv);

            // Load User Data from Firestore if auth
            if (auth.currentUser) {
                const uid = auth.currentUser.uid;

                // 1. Profile Data from Firestore
                const userData = await fetchUserData(uid);
                if (userData) {
                    setUsername(userData.username || 'User');
                    setEmail(userData.email || auth.currentUser.email);
                    setSkinType(userData.skinType);
                    setVitaminDLevel(userData.vitaminDLevel || null);

                    // Use Firestore profile image if available
                    // Priority: profileImageUrl (New) -> profileImage (Legacy)
                    const remoteImage = userData.profileImageUrl || userData.profileImage;

                    if (remoteImage) {
                        console.log('[DEBUG] Loaded profile image from Firestore:', remoteImage);
                        setProfileImageState(remoteImage);
                    } else {
                        console.log('[DEBUG] No profile image found in Firestore.');
                    }
                } else {
                    // Fallback to Firebase Auth email
                    setEmail(auth.currentUser.email || 'user@example.com');
                }

                // 2. Stats Calculation from Firestore
                const sessionStats = await getSessionStats(uid);
                setStats(sessionStats);

            } else {
                // Fallback to local
                const localUser = await getUsername();
                if (localUser) setUsername(localUser);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateName = async () => {
        if (!newName.trim() || newName.length < 2) {
            Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
            return;
        }

        try {
            const trimmed = newName.trim();
            // Local update
            await updateUsername(trimmed);

            // Firestore update
            if (auth.currentUser) {
                await saveUserToFirestore(auth.currentUser.uid, { username: trimmed });
            }

            setUsername(trimmed);
            setIsEditModalVisible(false);
            Alert.alert('Success', 'Profile updated.');
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile.');
        }
    };
    // ==========================================
    // PHOTO UPLOAD FLOW
    // ==========================================

    /**
     * Step 1: Pick image from gallery
     * Shows confirmation modal with preview
     */
    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // Crop is OPTIONAL - user can edit if they want
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                // Store pending image and show confirmation modal
                setPendingImage(result.assets[0].uri);
                setIsPhotoModalVisible(true);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to open image picker.');
        }
    };

    /**
     * Step 2a: Confirm and upload image to Firebase Storage
     */
    const confirmUpload = async () => {
        if (!pendingImage) return;

        try {
            setIsUploading(true);

            if (auth.currentUser) {
                const uid = auth.currentUser.uid;

                // Upload to Firebase Storage and get URL
                const downloadURL = await uploadProfileImage(uid, pendingImage);

                if (downloadURL) {
                    // Update Firestore
                    await saveUserToFirestore(uid, { profileImageUrl: downloadURL });

                    // Update local state immediately
                    setProfileImageState(downloadURL);

                    Alert.alert('Success', 'Profile photo updated!');
                } else {
                    Alert.alert('Upload Failed', 'Could not upload image to cloud.');
                }
            } else {
                Alert.alert('Error', 'You must be logged in to update profile photo.');
            }

            setIsPhotoModalVisible(false);
            setPendingImage(null);
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', 'Failed to upload photo.');
            setIsPhotoModalVisible(false);
            setPendingImage(null);
        } finally {
            setIsUploading(false);
        }
    };

    /**
     * Step 2b: Cancel and discard selected image
     */
    const cancelUpload = () => {
        setPendingImage(null);
        setIsPhotoModalVisible(false);
    };

    // UV Preference handlers
    const handleUseGPS = async () => {
        try {
            await setManualUV(null); // Clear manual UV
            setManualUVState(null);
            setIsUVModalVisible(false);
            Alert.alert('Success', 'UV data will now be fetched automatically via GPS.');
        } catch (error) {
            Alert.alert('Error', 'Failed to update UV preference.');
        }
    };

    const handleSaveManualUV = async () => {
        const uvValue = parseFloat(uvInputValue);
        if (isNaN(uvValue) || uvValue < 0 || uvValue > 15) {
            Alert.alert('Invalid Input', 'Please enter a valid UV index between 0 and 15.');
            return;
        }
        try {
            await setManualUV(uvValue);
            setManualUVState(uvValue);
            setIsUVModalVisible(false);
            setUVInputValue('');
            Alert.alert('Success', `UV Index set to ${uvValue}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to save UV value.');
        }
    };

    const handleSaveVitaminD = async () => {
        const val = parseFloat(vitDInputValue);
        if (isNaN(val) || val < 0) {
            Alert.alert("Invalid Input", "Please enter a valid number");
            return;
        }

        try {
            if (auth.currentUser) {
                await saveUserToFirestore(auth.currentUser.uid, {
                    vitaminDLevel: val,
                    vitaminDLastCheck: new Date().toISOString()
                });
                setVitaminDLevel(val);
                setIsVitDModalVisible(false);
                setVitDInputValue('');
                Alert.alert("Success", "Vitamin D level updated.");
            }
        } catch (e) {
            Alert.alert("Error", "Failed to update profile");
        }
    };

    const getVitDStatus = (val) => {
        if (!val) return null;
        const num = parseFloat(val);
        if (isNaN(num)) return null;
        if (num < 20) return { label: 'Deficient', color: '#F44336', icon: AlertTriangle };
        if (num < 30) return { label: 'Insufficient', color: '#FF9800', icon: Info };
        if (num <= 100) return { label: 'Sufficient', color: '#4CAF50', icon: CheckCircle };
        return { label: 'Toxicity Risk', color: '#F44336', icon: AlertTriangle };
    };

    const vitDStatus = getVitDStatus(vitDInputValue);
    const VitDIcon = vitDStatus?.icon;

    const StatItem = ({ label, value, icon: Icon, color }) => (
        <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                <Icon size={20} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    const ProfileAction = ({ icon: Icon, label, onPress, showArrow = true, value }) => (
        <TouchableOpacity style={styles.actionRow} onPress={onPress}>
            <View style={styles.actionLeft}>
                <View style={styles.actionIcon}>
                    <Icon size={20} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>{label}</Text>
            </View>
            <View style={styles.actionRight}>
                {value && <Text style={styles.actionValue}>{value}</Text>}
                {showArrow && <ChevronRight size={18} color={colors.textSecondary} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LinearGradient
                colors={isDark ? GRADIENTS.night : GRADIENTS.sunrise}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                opacity={0.1}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                {/* 1. COMPACT HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.menuBtn} onPress={() => setIsMenuOpen(true)}>
                        <MoreVertical size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Profile</Text>
                    <View style={{ width: 24 }} />
                </View>

                <Animated.View entering={FadeInDown.duration(500)} style={styles.profileSection}>
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                        <View style={styles.avatarContainer}>
                            {profileImage ? (
                                <Image source={{ uri: profileImage }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                    <Text style={{ fontSize: 32, color: '#FFF', fontWeight: 'bold' }}>
                                        {username.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                <Camera size={12} color="#FFF" />
                            </View>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{username}</Text>
                        <Text style={styles.userEmail}>{email}</Text>

                        <TouchableOpacity
                            style={styles.editProfileBtn}
                            onPress={() => {
                                setNewName(username);
                                setIsEditModalVisible(true);
                            }}
                        >
                            <Text style={styles.editProfileText}>Edit Profile</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* 2. STATS CARD */}
                <Animated.View entering={ZoomIn.delay(200)} style={styles.card}>
                    <View style={styles.statsRow}>
                        <StatItem
                            label="Sessions"
                            value={stats.totalSessions}
                            icon={Activity}
                            color="#4CAF50" // Green
                        />
                        <View style={styles.dividerV} />
                        <StatItem
                            label="Minutes"
                            value={stats.totalMinutes}
                            icon={Clock}
                            color="#FF9800" // Orange
                        />
                        <View style={styles.dividerV} />
                        <StatItem
                            label="Day Streak"
                            value={stats.currentStreak}
                            icon={Sun}
                            color="#F44336" // Red
                        />
                    </View>
                </Animated.View>

                {/* 3. MY SUN PROFILE */}
                <Text style={styles.sectionTitle}>My Sun Profile</Text>
                <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
                    <ProfileAction
                        icon={Shield}
                        label="Skin Type"
                        value={`Type ${skinType || '?'}`}
                        onPress={() => navigation.navigate('ChangeSkinType')}
                    />
                    <View style={styles.dividerH} />
                    <ProfileAction
                        icon={Sun}
                        label="UV Preference"
                        value={manualUV ? `Fixed: ${manualUV}` : 'Auto (GPS)'}
                        onPress={() => setIsUVModalVisible(true)}
                    />
                    <View style={styles.dividerH} />
                    <ProfileAction
                        icon={Activity}
                        label="Vitamin D Level"
                        value={vitaminDLevel ? `${vitaminDLevel} ng/mL` : 'Not Set'}
                        onPress={() => setIsVitDModalVisible(true)}
                    />
                </Animated.View>

                {/* 4. ACTIONS */}
                <Text style={styles.sectionTitle}>General</Text>
                <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
                    <ProfileAction
                        icon={Info}
                        label="About Suntime"
                        onPress={() => Alert.alert('Suntime', 'Version 1.0.0\nHackathon 2026 Build')}
                    />

                </Animated.View>

            </ScrollView>

            <MenuDrawer
                isVisible={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                navigation={navigation}
                username={username}
                profileImage={profileImage}
                email={email}
            />

            {/* Edit Name Modal */}
            <Modal visible={isEditModalVisible} transparent animationType="fade">
                <TouchableWithoutFeedback onPress={() => setIsEditModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Edit Profile Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholder="Enter your name"
                                    placeholderTextColor={colors.textSecondary}
                                />
                                <View style={styles.modalButtons}>
                                    <StandardButton title="Cancel" onPress={() => setIsEditModalVisible(false)} variant="ghost" style={{ flex: 1 }} />
                                    <View style={{ width: 10 }} />
                                    <StandardButton title="Save" onPress={handleUpdateName} style={{ flex: 1 }} />
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* UV Preference Modal */}
            <Modal visible={isUVModalVisible} transparent animationType="fade">
                <TouchableWithoutFeedback onPress={() => setIsUVModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>UV Data Source</Text>
                                <Text style={[styles.modalSubtitle, { marginBottom: SPACING.lg }]}>
                                    Choose how to get UV Index data
                                </Text>

                                {/* GPS Option */}
                                <TouchableOpacity
                                    style={[
                                        styles.uvOptionCard,
                                        !manualUV && styles.uvOptionCardActive
                                    ]}
                                    onPress={handleUseGPS}
                                >
                                    <View style={styles.uvOptionIcon}>
                                        <MapPin size={24} color={colors.primary} />
                                    </View>
                                    <View style={styles.uvOptionText}>
                                        <Text style={styles.uvOptionTitle}>Use GPS (Automatic)</Text>
                                        <Text style={styles.uvOptionDesc}>Fetch UV from weather API</Text>
                                    </View>
                                    {!manualUV && <Text style={styles.uvCheck}>✓</Text>}
                                </TouchableOpacity>

                                {/* Manual Option */}
                                <View style={[styles.uvOptionCard, styles.uvManualContainer]}>
                                    <View style={styles.uvOptionRow}>
                                        <View style={styles.uvOptionIcon}>
                                            <Edit3 size={24} color={colors.primary} />
                                        </View>
                                        <View style={styles.uvOptionText}>
                                            <Text style={styles.uvOptionTitle}>Enter Manual UV</Text>
                                            <Text style={styles.uvOptionDesc}>Set a fixed UV value (0-15)</Text>
                                        </View>
                                    </View>
                                    <View style={styles.uvInputRow}>
                                        <TextInput
                                            style={styles.uvInput}
                                            value={uvInputValue}
                                            onChangeText={setUVInputValue}
                                            placeholder="e.g. 5"
                                            placeholderTextColor={colors.textSecondary}
                                            keyboardType="numeric"
                                            maxLength={4}
                                        />
                                        <StandardButton
                                            title="Set"
                                            onPress={handleSaveManualUV}
                                            style={{ marginLeft: SPACING.sm, paddingHorizontal: SPACING.lg }}
                                        />
                                    </View>
                                </View>

                                <StandardButton
                                    title="Close"
                                    onPress={() => setIsUVModalVisible(false)}
                                    variant="ghost"
                                    style={{ marginTop: SPACING.md }}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Photo Upload Confirmation Modal */}
            <Modal visible={isPhotoModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.photoModalContent}>
                        <Text style={styles.modalTitle}>Update Profile Photo</Text>

                        {/* Image Preview */}
                        {pendingImage && (
                            <View style={styles.photoPreviewContainer}>
                                <Image
                                    source={{ uri: pendingImage }}
                                    style={styles.photoPreview}
                                />
                            </View>
                        )}

                        <Text style={styles.photoHint}>
                            This photo will be visible on your profile
                        </Text>

                        {/* Action Buttons */}
                        <View style={styles.photoModalButtons}>
                            <TouchableOpacity
                                style={styles.cancelPhotoBtn}
                                onPress={cancelUpload}
                                disabled={isUploading}
                            >
                                <X size={20} color={colors.textSecondary} />
                                <Text style={styles.cancelPhotoText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmPhotoBtn, isUploading && { opacity: 0.6 }]}
                                onPress={confirmUpload}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Check size={20} color="#FFF" />
                                        <Text style={styles.confirmPhotoText}>Done</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    headerTitle: {
        ...TYPOGRAPHY.heading,
        color: colors.text,
        fontSize: moderateScale(18),
    },
    menuBtn: {
        padding: 4,
    },

    // Profile Section
    profileSection: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    avatarContainer: {
        marginBottom: SPACING.md,
        position: 'relative',
        ...SHADOWS.medium,
    },
    avatar: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    userInfo: {
        alignItems: 'center',
    },
    userName: {
        ...TYPOGRAPHY.heading,
        color: colors.text,
        fontSize: moderateScale(22),
        marginBottom: 2,
    },
    userEmail: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginBottom: SPACING.sm,
    },
    editProfileBtn: {
        backgroundColor: colors.primary + '15',
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.full,
    },
    editProfileText: {
        fontSize: moderateScale(12),
        fontWeight: '600',
        color: colors.primary,
    },

    // Card Styles
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    statValue: {
        ...TYPOGRAPHY.heading,
        fontSize: moderateScale(18),
        color: colors.text,
    },
    statLabel: {
        fontSize: moderateScale(11),
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dividerV: {
        width: 1,
        height: '70%',
        backgroundColor: colors.border,
    },
    dividerH: {
        height: 1,
        width: '100%',
        backgroundColor: colors.border,
        marginVertical: SPACING.sm,
    },

    // Action Styles
    sectionTitle: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.xs,
        marginLeft: SPACING.xs,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.xs + 2,
    },
    actionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        width: 32,
        alignItems: 'flex-start',
    },
    actionLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '500',
        color: colors.text,
    },
    actionRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionValue: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginRight: 6,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        ...SHADOWS.medium,
    },
    modalTitle: {
        ...TYPOGRAPHY.heading,
        fontSize: moderateScale(18),
        marginBottom: SPACING.md,
        color: colors.text,
        textAlign: 'center',
    },
    input: {
        backgroundColor: colors.background,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: SPACING.lg,
    },
    modalButtons: {
        flexDirection: 'row',
    },
    modalSubtitle: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    // UV Modal Styles
    uvOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: colors.background,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 2,
        borderColor: colors.border,
        marginBottom: SPACING.md,
    },
    uvOptionCardActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    uvManualContainer: {
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    uvOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    uvOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    uvOptionText: {
        flex: 1,
    },
    uvOptionTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    uvOptionDesc: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
    },
    uvCheck: {
        fontSize: 20,
        color: colors.primary,
        fontWeight: 'bold',
    },
    uvInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    uvInput: {
        flex: 1,
        backgroundColor: colors.cardBackground,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.primary,
        fontSize: moderateScale(16),
        textAlign: 'center',
    },
    // Photo Upload Modal Styles
    photoModalContent: {
        backgroundColor: colors.cardBackground,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        alignItems: 'center',
        ...SHADOWS.large,
        maxWidth: 340,
        width: '90%',
    },
    photoPreviewContainer: {
        marginVertical: SPACING.lg,
        borderRadius: 100,
        overflow: 'hidden',
        ...SHADOWS.medium,
    },
    photoPreview: {
        width: 180,
        height: 180,
        borderRadius: 90,
    },
    photoHint: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    photoModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: SPACING.md,
    },
    cancelPhotoBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cancelPhotoText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        marginLeft: SPACING.xs,
        fontWeight: '600',
    },
    confirmPhotoBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: colors.primary,
    },
    confirmPhotoText: {
        ...TYPOGRAPHY.body,
        color: '#FFF',
        marginLeft: SPACING.xs,
        fontWeight: '600',
    },
});
