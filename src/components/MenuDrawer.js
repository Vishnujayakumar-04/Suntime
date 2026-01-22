import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Image,
    Dimensions,
    TouchableWithoutFeedback,
    ScrollView,
    Switch,
    Alert
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    X,
    User,
    LogOut,
    Moon,
    Settings,
    Info,
    Lock,
    HelpCircle
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS, moderateScale } from '../constants/theme';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8;

const MenuItem = ({ icon: Icon, label, onPress, colors, danger, menuStyles }) => (
    <TouchableOpacity
        style={menuStyles.menuItem}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[menuStyles.iconContainer, { backgroundColor: danger ? colors.danger + '10' : colors.backgroundLight }]}>
            <Icon
                size={moderateScale(20)}
                color={danger ? colors.danger : colors.textSecondary}
            />
        </View>
        <Text style={[
            menuStyles.menuLabel,
            { color: danger ? colors.danger : colors.text }
        ]}>
            {label}
        </Text>
    </TouchableOpacity>
);

import FAQModal from './FAQModal';
import AboutModal from './AboutModal';

export default function MenuDrawer({
    isVisible,
    onClose,
    navigation,
    username,
    profileImage,
    email
}) {
    const { colors, isDark, toggleTheme } = useTheme();
    const { signOut } = useAuth();
    const [isFAQVisible, setIsFAQVisible] = React.useState(false);
    const [isAboutVisible, setIsAboutVisible] = React.useState(false);

    // Convert styles to use theme inside the component to ensure it updates
    const dynamicStyles = getStyles(colors, isDark);

    const opacity = useSharedValue(0);
    const translateX = useSharedValue(-DRAWER_WIDTH);

    useEffect(() => {
        if (isVisible) {
            opacity.value = withTiming(1, { duration: 300 });
            translateX.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            translateX.value = withTiming(-DRAWER_WIDTH, { duration: 300, easing: Easing.in(Easing.cubic) });
        }
    }, [isVisible]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    if (!isVisible) return null;

    const handleLogout = () => {
        onClose();
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                        } catch (err) {
                            console.error(err);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={dynamicStyles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[dynamicStyles.backdrop, backdropStyle]} />
                </TouchableWithoutFeedback>

                <Animated.View style={[dynamicStyles.drawer, drawerStyle]}>
                    <SafeAreaView style={dynamicStyles.container} edges={['top', 'bottom']}>

                        {/* 1. TOP PROFILE SECTION */}
                        <View style={dynamicStyles.header}>
                            <View style={dynamicStyles.profileRow}>
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} style={dynamicStyles.avatar} />
                                ) : (
                                    <View style={[dynamicStyles.avatar, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>
                                            {(username || 'U').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View style={dynamicStyles.profileInfo}>
                                    <Text style={dynamicStyles.profileName} numberOfLines={1}>{username || 'User'}</Text>
                                    <Text style={dynamicStyles.profileEmail} numberOfLines={1}>{email || 'user@example.com'}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={onClose} style={dynamicStyles.closeBtn}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={dynamicStyles.divider} />

                        {/* 2. MENU ITEMS */}
                        <ScrollView contentContainerStyle={dynamicStyles.menuContent}>
                            <Text style={dynamicStyles.sectionTitle}>Menu</Text>

                            <MenuItem
                                icon={HelpCircle}
                                label="FAQ"
                                colors={colors}
                                menuStyles={dynamicStyles}
                                onPress={() => { setIsFAQVisible(true); }}
                            />
                            <MenuItem
                                icon={Settings}
                                label="Settings"
                                colors={colors}
                                menuStyles={dynamicStyles}
                                onPress={() => { onClose(); navigation.navigate('Settings'); }}
                            />

                            <View style={{ height: SPACING.lg }} />
                            <Text style={dynamicStyles.sectionTitle}>Legal & Info</Text>

                            <MenuItem
                                icon={Lock}
                                label="Privacy Policy"
                                colors={colors}
                                menuStyles={dynamicStyles}
                                onPress={() => Alert.alert('Privacy Policy', 'Data is stored locally and on standardized Firestore servers. We do not sell your data.')}
                            />
                            <MenuItem
                                icon={Info}
                                label="About"
                                colors={colors}
                                menuStyles={dynamicStyles}
                                onPress={() => setIsAboutVisible(true)}
                            />
                        </ScrollView>

                        {/* 3. BOTTOM ACTIONS */}
                        <View style={dynamicStyles.footer}>
                            <View style={dynamicStyles.themeRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Moon size={20} color={colors.text} style={{ marginRight: 10 }} />
                                    <Text style={dynamicStyles.footerLabel}>Dark Mode</Text>
                                </View>
                                <Switch
                                    value={isDark}
                                    onValueChange={toggleTheme}
                                    trackColor={{ false: '#767577', true: colors.primary }}
                                    thumbColor={'#f4f3f4'}
                                />
                            </View>

                            <TouchableOpacity style={dynamicStyles.logoutBtn} onPress={handleLogout}>
                                <LogOut size={20} color={colors.danger} style={{ marginRight: 10 }} />
                                <Text style={dynamicStyles.logoutText}>Log Out</Text>
                            </TouchableOpacity>
                        </View>

                    </SafeAreaView>
                </Animated.View>

                {/* FAQ Modal */}
                <FAQModal
                    visible={isFAQVisible}
                    onClose={() => setIsFAQVisible(false)}
                />

                {/* About Modal */}
                <AboutModal
                    visible={isAboutVisible}
                    onClose={() => setIsAboutVisible(false)}
                />
            </View>
        </Modal>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    overlay: {
        flex: 1,
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        backgroundColor: colors.cardBackground, // Solid background
        borderTopRightRadius: BORDER_RADIUS.xl,
        borderBottomRightRadius: BORDER_RADIUS.xl,
        ...SHADOWS.large,
        zIndex: 1001,
    },
    container: {
        flex: 1,
    },
    // Header
    header: {
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.sm,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: SPACING.md,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
        color: colors.text,
        fontSize: moderateScale(16),
    },
    profileEmail: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        fontSize: moderateScale(12),
    },
    closeBtn: {
        padding: SPACING.xs,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: SPACING.xs,
        marginHorizontal: SPACING.md,
    },
    // Menu
    menuContent: {
        padding: SPACING.md,
    },
    sectionTitle: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.sm,
        marginTop: SPACING.xs,
        marginLeft: SPACING.xs,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm + 4,
        paddingHorizontal: SPACING.xs,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: 2,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    menuLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '500',
        color: colors.text,
        fontSize: moderateScale(15),
    },
    // Footer
    footer: {
        padding: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    },
    themeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    footerLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: colors.text,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        backgroundColor: colors.danger + '15',
        borderRadius: BORDER_RADIUS.lg,
    },
    logoutText: {
        ...TYPOGRAPHY.subheading,
        color: colors.danger,
        fontWeight: '600',
    }
});
