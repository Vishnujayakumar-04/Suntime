import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors } from '../constants/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [isDark, setIsDark] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const storedTheme = await AsyncStorage.getItem('app_theme');
            if (storedTheme) {
                setIsDark(storedTheme === 'dark');
            } else {
                // Default to system preference if no stored preference
                setIsDark(systemScheme === 'dark');
            }
        } catch (error) {
            console.error('Failed to load theme:', error);
        } finally {
            setIsLoaded(true);
        }
    };

    const toggleTheme = async () => {
        try {
            const newMode = !isDark;
            setIsDark(newMode);
            await AsyncStorage.setItem('app_theme', newMode ? 'dark' : 'light');
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    const setMode = async (mode) => {
        try {
            const newMode = mode === 'dark';
            setIsDark(newMode);
            await AsyncStorage.setItem('app_theme', mode);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    }

    const colors = isDark ? DarkColors : LightColors;

    // Use this context to get correct colors for dynamic theme handling
    return (
        <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setMode, isLoaded }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
