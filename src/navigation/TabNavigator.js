/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, LayoutAnimation } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sun, Activity, BarChart2, User } from 'lucide-react-native';
import { COLORS, SHADOWS, moderateScale } from '../constants/theme';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withTiming } from 'react-native-reanimated';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ProgressScreen from '../screens/ProgressScreen';
import LearnScreen from '../screens/LearnScreen';
import ProfileScreen from '../screens/ProfileScreen';



const Tab = createBottomTabNavigator();

const TabItem = ({ isFocused, options, onPress, onLongPress, Icon, label }) => {
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
                    color={isFocused ? COLORS.primary : '#999999'}
                    strokeWidth={isFocused ? 2.5 : 2}
                />
                {isFocused && (
                    <Text
                        numberOfLines={1}
                        style={[styles.tabLabel, { color: COLORS.primary }]}
                    >
                        {label}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
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
                        />
                    );
                })}
            </View>
        </View>
    );
};

export default function TabNavigator() {
    return (
        <Tab.Navigator
            tabBar={props => <CustomTabBar {...props} />}
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
                    tabBarLabel: 'Plans',
                    tabBarIcon: ({ color, size, strokeWidth }) => <Activity color={color} size={size} strokeWidth={strokeWidth} />,
                }}
            />
            <Tab.Screen
                name="Progress"
                component={ProgressScreen}
                options={{
                    tabBarLabel: 'Stats',
                    tabBarIcon: ({ color, size, strokeWidth }) => <BarChart2 color={color} size={size} strokeWidth={strokeWidth} />,
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

const styles = StyleSheet.create({
    placeholderContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    placeholderText: {
        ...COLORS.heading,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    placeholderSubText: {
        color: COLORS.textSecondary,
    },
    tabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        backgroundColor: 'transparent', // Transparent container for floating effect
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        width: '94%',
        borderRadius: 40, // Pill shape
        height: 65,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        ...SHADOWS.medium,
        shadowColor: '#000',
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
        flex: 1.8, // Grow active item
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
        backgroundColor: '#F5F5F7', // Soft highlight
        gap: 8,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
});
