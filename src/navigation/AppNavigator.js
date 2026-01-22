import React, { useState, useEffect } from 'react';
import { AppState, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { isAppLockEnabled } from '../utils/auth';
import LoadingScreen from '../components/LoadingScreen';

// Unified Auth Screen
import AuthScreen from '../screens/AuthScreen';

// Setup Wizard
import SetupStep1SkinType from '../setup/SetupStep1SkinType';
import SetupStep2Sunscreen from '../setup/SetupStep2Sunscreen';
import SetupStep3Location from '../setup/SetupStep3Location';
import SetupStep4VitaminD from '../setup/SetupStep4VitaminD';
import SetupStep5Disclaimer from '../setup/SetupStep5Disclaimer';

// Skin Scanner Screen
import SkinScannerScreen from '../screens/SkinScannerScreen';

// Main App
import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { colors, isDark } = useTheme();
    const { user, initializing, isAuthenticated, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Auth');
    const navigationRef = useNavigationContainerRef();

    // App Lock Listener
    const lastBackgroundTime = React.useRef(Date.now());

    useEffect(() => {
        if (!initializing) {
            checkAppState();
        }

        // When user logs out (isAuthenticated becomes false), reset to Auth
        if (!initializing && !isAuthenticated && navigationRef.isReady()) {
            setInitialRoute('Auth');
            navigationRef.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
            });
        }
    }, [initializing, isAuthenticated, userProfile]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                lastBackgroundTime.current = Date.now();
            } else if (nextAppState === 'active') {
                const now = Date.now();
                const timeInBackground = now - lastBackgroundTime.current;

                // Grace period of 5 seconds (to allow Share/Permissions dialogs)
                if (timeInBackground < 5000) {
                    return;
                }

                const locked = await isAppLockEnabled();
                if (locked && navigationRef.isReady() && !isAuthenticated) {
                    // Navigate to Auth screen only if not authenticated
                    navigationRef.reset({
                        index: 0,
                        routes: [{ name: 'Auth' }],
                    });
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, [isAuthenticated]);

    const checkAppState = async () => {
        try {
            if (isAuthenticated && user) {
                // User is logged in via Firebase
                // Check setupCompleted from Firestore profile
                // This is the SINGLE SOURCE OF TRUTH

                const setupDone = userProfile?.setupCompleted === true;

                console.log('📱 Auth State Check:', {
                    userId: user.uid,
                    hasProfile: !!userProfile,
                    setupCompleted: setupDone
                });

                if (setupDone) {
                    // Setup is complete - go directly to main app
                    setInitialRoute('MainTabs');
                } else {
                    // Setup not complete - show setup flow
                    setInitialRoute('SetupStep1');
                }
            } else {
                // Not authenticated - go to Auth
                setInitialRoute('Auth');
            }
        } catch (error) {
            console.error('App state check error:', error);
            setInitialRoute('Auth');
        } finally {
            setLoading(false);
        }
    };

    // Navigation Theme based on context
    const navTheme = {
        dark: isDark,
        colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.cardBackground,
            text: colors.text,
            border: colors.border,
            notification: colors.accent,
        },
    };

    if (loading || initializing) {
        return <LoadingScreen message="Starting Suntime..." />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <NavigationContainer ref={navigationRef} theme={navTheme}>
                <Stack.Navigator
                    initialRouteName={initialRoute}
                    screenOptions={{
                        contentStyle: { backgroundColor: colors.background },
                        animation: 'slide_from_right',
                        headerShown: false,
                        headerStyle: { backgroundColor: colors.cardBackground },
                        headerTintColor: colors.text,
                        headerTitleStyle: { fontWeight: 'bold' },
                    }}
                >
                    {/* UNIFIED AUTH SCREEN - Login/Register tabs */}
                    <Stack.Screen
                        name="Auth"
                        component={AuthScreen}
                        options={{ gestureEnabled: false }}
                    />

                    {/* SETUP WIZARD */}
                    <Stack.Screen
                        name="SetupStep1"
                        component={SetupStep1SkinType}
                        options={{ gestureEnabled: false }}
                    />
                    <Stack.Screen
                        name="SetupStep2"
                        component={SetupStep2Sunscreen}
                    />
                    <Stack.Screen
                        name="SetupStep3"
                        component={SetupStep3Location}
                    />
                    <Stack.Screen
                        name="SetupStep4"
                        component={SetupStep4VitaminD}
                    />
                    <Stack.Screen
                        name="SetupStep5"
                        component={SetupStep5Disclaimer}
                        options={{ gestureEnabled: false }}
                    />

                    {/* SKIN SCANNER - Camera based skin detection */}
                    <Stack.Screen
                        name="SkinScanner"
                        component={SkinScannerScreen}
                        options={{
                            headerShown: true,
                            headerTitle: 'Scan Skin Type',
                            headerBackTitleVisible: false,
                        }}
                    />

                    {/* MAIN APP - Daily Dashboard */}
                    <Stack.Screen
                        name="MainTabs"
                        component={TabNavigator}
                    />

                    <Stack.Screen
                        name="History"
                        component={HistoryScreen}
                        options={{
                            headerShown: true,
                            headerTitle: 'History',
                            headerBackTitleVisible: false,
                        }}
                    />

                    <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{
                            headerShown: true,
                            headerTitle: 'Settings',
                            headerBackTitleVisible: false,
                        }}
                    />

                    {/* Modal for changing skin type from Settings */}
                    <Stack.Screen
                        name="ChangeSkinType"
                        component={OnboardingScreen}
                        options={{
                            presentation: 'modal',
                            headerShown: true,
                            headerTitle: 'Change Skin Type',
                        }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </View>
    );
}
