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
    Switch
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
    SlideInLeft,
    SlideOutLeft
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    X,
    Activity,
    BarChart2,
    Calendar,
    HelpCircle,
    User,
    LogOut,
    Moon,
    Settings,
    History,
    Shield
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS, moderateScale } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.85; // 85% of screen width

const MenuItem = ({ icon: Icon, label, onPress, active }) => (
    <TouchableOpacity
        style={[styles.menuItem, active && styles.menuItemActive]}
        onPress={onPress}
    >
        <Icon
            size={moderateScale(20)}
            color={active ? COLORS.text : '#999'}
            style={styles.menuIcon}
        />
        <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
            {label}
        </Text>
    </TouchableOpacity>
);

const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
);

export default function MenuDrawer({
    isVisible,
    onClose,
    navigation,
    username,
    profileImage,
    onLogout
}) {
    const opacity = useSharedValue(0);
    const translateX = useSharedValue(-elementWidth);

    const elementWidth = DRAWER_WIDTH;

    useEffect(() => {
        if (isVisible) {
            opacity.value = withTiming(1, { duration: 300 });
            translateX.value = withTiming(0, { duration: 300 });
        } else {
            opacity.value = withTiming(0, { duration: 300 });
            translateX.value = withTiming(-elementWidth, { duration: 300 });
        }
    }, [isVisible]);

    // Backdrop animation style
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    // Drawer slide animation style
    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    if (!isVisible) return null;

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Backdrop / Tap outside to close */}
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, backdropStyle]} />
                </TouchableWithoutFeedback>

                {/* Drawer Content */}
                <Animated.View style={[styles.drawer, drawerStyle]}>
                    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

                        {/* 1. TOP SECTION */}
                        <View style={styles.header}>
                            <View style={styles.brandContainer}>
                                <View style={styles.logoCircle}>
                                    <Shield size={moderateScale(20)} color="#FFF" />
                                </View>
                                <View>
                                    <Text style={styles.appName}>Suntime</Text>
                                    <Text style={styles.tagline}>Health Is Wealth</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={moderateScale(24)} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                        >
                            {/* 2. MENU SECTION */}
                            <SectionHeader title="MENU" />

                            {/* Mapping requested items to App Functionality where possible */}
                            <MenuItem
                                icon={History}
                                label="Activities (History)"
                                onPress={() => { onClose(); navigation.navigate('History'); }}
                            />
                            <MenuItem
                                icon={BarChart2}
                                label="Performance"
                                onPress={() => { onClose(); navigation.navigate('Progress'); }}
                            />
                            <MenuItem
                                icon={Calendar}
                                label="Schedule"
                                onPress={() => { }}
                            />


                            {/* 3. ACCOUNT SECTION */}
                            <View style={styles.spacer} />
                            <SectionHeader title="ACCOUNT" />

                            <MenuItem
                                icon={Settings}
                                label="Settings"
                                onPress={() => { onClose(); navigation.navigate('Settings'); }}
                            />

                            <MenuItem
                                icon={HelpCircle}
                                label="Support"
                                onPress={() => { }}
                            />
                            <MenuItem
                                icon={LogOut}
                                label="Log Out"
                                onPress={onLogout}
                            />
                        </ScrollView>

                        {/* 4. BOTTOM SECTION: Profile Card + Dark Mode */}
                        <View style={styles.footer}>


                            <View style={styles.darkModeRow}>
                                <View style={styles.darkModeLabel}>
                                    <Moon size={moderateScale(18)} color="#666" />
                                    <Text style={styles.darkModeText}>Dark Mode</Text>
                                </View>
                                <Switch
                                    value={false}
                                    trackColor={{ false: '#E0E0E0', true: COLORS.primary }}
                                    thumbColor={'#FFF'}
                                />
                            </View>
                        </View>
                    </SafeAreaView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    drawer: {
        width: DRAWER_WIDTH,
        height: '100%',
        backgroundColor: '#FFFFFF',
        ...SHADOWS.medium, // React Native shadow
        elevation: 10, // Android shadow
    },
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        marginBottom: SPACING.sm,
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    logoCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    appName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    tagline: {
        fontSize: 10,
        color: '#999',
    },
    closeBtn: {
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#999',
        marginBottom: SPACING.md,
        letterSpacing: 1,
        marginTop: SPACING.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.md,
    },
    menuItemActive: {
        backgroundColor: '#F7F7F7',
        paddingHorizontal: SPACING.md,
        marginLeft: -SPACING.md, // offset
    },
    menuIcon: {
        marginRight: SPACING.md,
    },
    menuLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    menuLabelActive: {
        fontWeight: '600',
    },
    spacer: {
        height: SPACING.lg,
    },
    footer: {
        padding: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: '#FFFFFF',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    placeholderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: {
        marginLeft: SPACING.md,
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    userName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    userEmail: {
        fontSize: 12,
        color: '#999',
    },
    darkModeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    darkModeLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    darkModeText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
});
