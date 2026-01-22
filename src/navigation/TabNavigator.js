/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, LayoutAnimation } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sun, Activity, User, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS, SHADOWS, moderateScale } from '../constants/theme';


// Screens
import HomeScreen from '../screens/HomeScreen';
import ProgressScreen from '../screens/ProgressScreen';
import LearnScreen from '../screens/LearnScreen';
import ProfileScreen from '../screens/ProfileScreen';



const Tab = createBottomTabNavigator();

const TabItem = ({ isFocused, options, onPress, onLongPress, Icon, label, colors, styles }) => {
    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.tabItem, isFocused ? styles.tabItemActive : null]}
        >
            <View style={[styles.contentContainer, isFocused && styles.contentActive]}>
                <Icon
                    size={22}
                    color={isFocused ? colors.primary : colors.textSecondary}
                    strokeWidth={isFocused ? 2.5 : 2}
                />
                {isFocused && (
                    <Text
                        numberOfLines={1}
                        style={[styles.tabLabel, { color: colors.primary }]}
                    >
                        {label}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

const CustomTabBar = ({ state, descriptors, navigation, colors, styles }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.tabBar}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label = options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            // Animate layout changes
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            navigation.navigate(route.name);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    const Icon = options.tabBarIcon;

                    return (
                        <TabItem
                            key={index}
                            isFocused={isFocused}
                            options={options}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            Icon={Icon}
                            label={label}
                            colors={colors}
                            styles={styles}
                        />
                    );
                })}
            </View>
        </View>
    );
};

export default function TabNavigator() {
    const { colors } = useTheme();
    // We need styles inside the component or passed down?
    // Actually, create styles here.
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <Tab.Navigator
            tabBar={props => <CustomTabBar {...props} colors={colors} styles={styles} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size, strokeWidth }) => <Sun color={color} size={size} strokeWidth={strokeWidth} />,
                }}
            />
            <Tab.Screen
                name="Activities"
                component={LearnScreen} // Renamed Learn to Activities/Plans
                options={{
                    tabBarLabel: 'Learn',
                    tabBarIcon: ({ color, size, strokeWidth }) => <Activity color={color} size={size} strokeWidth={strokeWidth} />,
                }}
            />
            <Tab.Screen
                name="Progress"
                component={ProgressScreen}
                options={{
                    tabBarLabel: 'Stats',
                    tabBarIcon: ({ color, size, strokeWidth }) => <TrendingUp color={color} size={size} strokeWidth={strokeWidth} />,
                }}
            />

            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size, strokeWidth }) => <User color={color} size={size} strokeWidth={strokeWidth} />,
                }}
            />
        </Tab.Navigator>
    );
}

const getStyles = (colors) => StyleSheet.create({
    placeholderContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    placeholderText: {
        color: colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    placeholderSubText: {
        color: colors.textSecondary,
    },
    tabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: colors.cardBackground,
        width: '94%',
        borderRadius: 40,
        height: 65,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        ...SHADOWS.medium,
        shadowColor: colors.text, // Subtle shadow adjustment?
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
    tabItem: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    tabItemActive: {
        flex: 1.8,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 30,
    },
    contentActive: {
        backgroundColor: colors.backgroundLight,
        gap: 8,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
});
