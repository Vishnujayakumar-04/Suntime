import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { isSetupComplete } from '../utils/storage';
import { isUserRegistered } from '../utils/auth';

// Unified Auth Screen
import AuthScreen from '../screens/AuthScreen';

// Setup Wizard
import SetupStep1SkinType from '../screens/setup/SetupStep1SkinType';
import SetupStep2Sunscreen from '../screens/setup/SetupStep2Sunscreen';
import SetupStep3Location from '../screens/setup/SetupStep3Location';
import SetupStep4Disclaimer from '../screens/setup/SetupStep4Disclaimer';

// Main App
import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const [loading, setLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Auth');

    useEffect(() => {
        checkAppState();
    }, []);

    const checkAppState = async () => {
        try {
            console.log('AppNavigator: Checking app state...');

            const registered = await isUserRegistered();
            console.log('AppNavigator: Registered:', registered);

            const setupDone = await isSetupComplete();
            console.log('AppNavigator: SetupDone:', setupDone);

            if (registered) {
                if (setupDone) {
                    setInitialRoute('MainTabs');
                } else {
                    setInitialRoute('SetupStep1');
                }
            } else {
                setInitialRoute('Auth');
            }
        } catch (error) {
            console.error('AppNavigator: State check error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return null;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{
                    headerShown: false,
                    headerStyle: { backgroundColor: '#FFFFFF' },
                    headerTintColor: '#000000',
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
                    component={SetupStep4Disclaimer}
                    options={{ gestureEnabled: false }}
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
    );
}
