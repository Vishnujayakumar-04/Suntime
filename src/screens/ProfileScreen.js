import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import { User, Mail, Shield, MapPin, LogOut, ChevronRight, History, MoreVertical, Camera } from 'lucide-react-native';
import { getUsername, logout } from '../utils/auth';
import { getDefaultPreferences, getProfileImage, setProfileImage } from '../utils/storage';
import MenuDrawer from '../components/MenuDrawer';

export default function ProfileScreen({ navigation }) {
    const [username, setUsername] = useState('User');
    const [preferences, setPreferences] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [profileImage, setProfileImageState] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const user = await getUsername();
        const prefs = await getDefaultPreferences();
        const savedImage = await getProfileImage();

        if (user) setUsername(user);
        if (prefs) setPreferences(prefs);
        if (savedImage) setProfileImageState(savedImage);
    };

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert("Permission Required", "You need to grant camera roll permissions to change your profile picture.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled) {
                const uri = result.assets[0].uri;
                setProfileImageState(uri);
                await setProfileImage(uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert("Error", "Failed to update profile picture.");
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Auth' }],
                        });
                    }
                }
            ]
        );
    };

    const SettingItem = ({ icon: Icon, label, value, onPress, showArrow = true }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
            <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                    <Icon size={moderateScale(20)} color={COLORS.primary} />
                </View>
                <View>
                    <Text style={styles.settingLabel}>{label}</Text>
                    {value && <Text style={styles.settingValue}>{value}</Text>}
                </View>
            </View>
            {showArrow && <ChevronRight size={moderateScale(20)} color={COLORS.textSecondary} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
                    <View>
                        <TouchableOpacity
                            style={styles.menuButton}
                            onPress={() => setIsMenuOpen(true)}
                        >
                            <MoreVertical size={moderateScale(24)} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.headerTitle}>Profile</Text>
                    {/* Placeholder View for balance if needed, or just let space-between handle it */}
                    <View style={{ width: moderateScale(24) }} />
                </Animated.View>

                {/* Profile Card */}
                <Animated.View entering={ZoomIn.delay(200)} style={styles.profileCard}>
                    <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                        ) : (
                            <User size={moderateScale(40)} color={COLORS.white} />
                        )}
                        <View style={styles.editIconContainer}>
                            <Camera size={moderateScale(12)} color={COLORS.primary} />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.username}>{username}</Text>
                    <Text style={styles.userRole}>Sun Safety Enthusiast</Text>
                </Animated.View>

                {/* Personal Information */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.card}>
                        <SettingItem
                            icon={User}
                            label="Username"
                            value={username}
                            showArrow={false}
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon={Mail}
                            label="Email"
                            value="user@example.com"
                            showArrow={false}
                        />

                    </View>
                </Animated.View>

                {/* Sun Prevention Profile */}
                <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
                    <Text style={styles.sectionTitle}>My Sun Profile</Text>
                    <View style={styles.card}>
                        <SettingItem
                            icon={Shield}
                            label="Skin Type"
                            value={`Type ${preferences?.skinType || 'Not Set'}`}
                            onPress={() => navigation.navigate('ChangeSkinType')}
                        />
                    </View>
                </Animated.View>



                <View style={styles.footerSpacer} />
            </ScrollView>

            {/* Slide-out Menu Drawer */}
            <MenuDrawer
                isVisible={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                navigation={navigation}
                username={username}
                profileImage={profileImage}
                onLogout={handleLogout}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    headerTitle: {
        ...TYPOGRAPHY.title,
        fontSize: moderateScale(28),
    },

    menuButton: {
        padding: SPACING.sm,
    },
    // menuDropdown styles removed as they are replaced by MenuDrawer
    profileCard: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    avatarContainer: {
        width: moderateScale(120),
        height: moderateScale(120),
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.medium,
        overflow: 'hidden', // Ensure image stays rounded
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.full,
        padding: 4,
        ...SHADOWS.small,
    },
    username: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    userRole: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    card: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        ...SHADOWS.small,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    settingLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.text,
    },
    settingValue: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: SPACING.xs,
    },

    footerSpacer: {
        height: moderateScale(100),
    }
});
