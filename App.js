import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React, { useEffect, useState, useCallback } from 'react';
import { LogBox, View, Text, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
    /* reloading the app might trigger some race conditions, ignore them */
});

// Configure notifications - wrapped in try-catch to prevent crashes
try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
} catch (error) {
    console.log('Notification handler setup failed:', error);
}

// Ignore warnings
LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'expo-notifications',
    'Reanimated',
]);

function App() {
    const [appIsReady, setAppIsReady] = useState(false);

    useEffect(() => {
        async function prepare() {
            try {
                // Give time for native modules to initialize
                await new Promise(resolve => setTimeout(resolve, 500));

                // Add a timeout race for permissions to prevent hanging
                const permissionPromise = requestNotificationPermissions();
                const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));

                await Promise.race([permissionPromise, timeoutPromise]);
            } catch (e) {
                console.warn('App preparation error:', e);
            } finally {
                setAppIsReady(true);
            }
        }

        prepare();

        // Failsafe: Hide splash screen after 5 seconds no matter what
        setTimeout(() => {
            SplashScreen.hideAsync().catch(() => { });
        }, 5000);

    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (appIsReady) {
            // Hide splash screen after layout
            await SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    const requestNotificationPermissions = async () => {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Notification permission not granted');
            }
        } catch (error) {
            // Silently fail - notifications are optional
            console.log('Notifications error:', error?.message || error);
        }
    };

    if (!appIsReady) {
        // Return null while preparing - splash screen is still visible
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <SafeAreaProvider>
                <ErrorBoundary>
                    <AuthProvider>
                        <ThemeProvider>
                            <AppNavigator />
                        </ThemeProvider>
                    </AuthProvider>
                </ErrorBoundary>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

export default App;
registerRootComponent(App);
