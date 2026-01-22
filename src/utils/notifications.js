import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Safe notification scheduling utility for Expo SDK 53+
 * Handles the new trigger format requirements
 */

/**
 * Schedule an immediate notification
 */
export const requestNotificationPermissions = async () => {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            console.log('[DEBUG] Notification permission requested. Status:', newStatus);
            return newStatus === 'granted';
        }
        return true;
    } catch (error) {
        console.log('[DEBUG] Error requesting notification permissions:', error);
        return false;
    }
};

export const scheduleImmediateNotification = async (title, body, options = {}) => {
    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: options.sound !== false,
                ...options,
            },
            trigger: null, // Immediate
        });
        console.log(`[DEBUG] Immediate Notification Scheduled: ${title} (ID: ${id})`);
        return id;
    } catch (error) {
        console.log('[DEBUG] Immediate notification error:', error?.message || error);
        return null;
    }
};

/**
 * Schedule a notification for a specific date/time
 */
export const scheduleNotificationAtDate = async (title, body, date, options = {}) => {
    try {
        // Calculate seconds from now
        const seconds = Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000));

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: options.sound !== false,
                ...options,
            },
            trigger: {
                type: 'timeInterval',
                seconds: seconds,
                repeats: false,
            },
        });
        console.log(`[DEBUG] Date Notification Scheduled: ${title} in ${seconds}s (ID: ${id})`);
        return id;
    } catch (error) {
        console.log('[DEBUG] Date notification error:', error?.message || error);
        return null;
    }
};

/**
 * Schedule a daily notification at a specific time
 */
export const scheduleDailyNotification = async (title, body, hour, minute, options = {}) => {
    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: options.sound !== false,
                ...options,
            },
            trigger: {
                type: 'daily',
                hour: hour,
                minute: minute,
            },
        });
        console.log(`[DEBUG] Daily Notification Scheduled: ${title} at ${hour}:${minute} (ID: ${id})`);
        return id;
    } catch (error) {
        console.log('[DEBUG] Daily notification error:', error?.message || error);
        return null;
    }
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (notificationId) => {
    try {
        if (notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
        }
    } catch (error) {
        console.log('Cancel notification error:', error?.message || error);
    }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.log('Cancel all notifications error:', error?.message || error);
    }
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = async () => {
    try {
        return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
        console.log('Get notifications error:', error?.message || error);
        return [];
    }
};

/**
 * Format seconds to MM:SS string
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string
 */
export const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Schedule a timer notification with accurate remaining time
 * Replaces any existing timer notification
 * @param {number} endTimestamp - Unix timestamp when timer ends
 * @param {string|null} existingNotificationId - ID of existing notification to cancel
 * @returns {Promise<string|null>} New notification ID
 */
export const scheduleTimerNotification = async (endTimestamp, existingNotificationId = null) => {
    try {
        // Cancel existing notification if any
        if (existingNotificationId) {
            await cancelNotification(existingNotificationId);
        }

        const now = Date.now();
        const remainingMs = endTimestamp - now;

        if (remainingMs <= 0) {
            // Timer already expired
            return null;
        }

        const remainingSeconds = Math.ceil(remainingMs / 1000);
        const endTime = new Date(endTimestamp);
        const timeString = endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

        // Schedule the completion notification
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Sun Exposure Complete!',
                body: 'Your safe sun time is up. Consider seeking shade.',
                sound: true,
                priority: 'high',
            },
            trigger: {
                type: 'timeInterval',
                seconds: remainingSeconds,
                repeats: false,
            },
        });

        console.log(`📢 Timer notification scheduled for ${timeString} (${remainingSeconds}s)`);
        return id;
    } catch (error) {
        console.log('Timer notification error:', error?.message || error);
        return null;
    }
};

/**
 * Show an ongoing timer notification (for Android)
 * Note: This is a one-time notification, not a true ongoing notification
 * @param {number} remainingSeconds - Seconds remaining
 * @param {number} endTimestamp - When timer ends
 */
export const showTimerProgressNotification = async (remainingSeconds, endTimestamp) => {
    try {
        const endTime = new Date(endTimestamp);
        const timeString = endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        const formattedRemaining = formatTimeRemaining(remainingSeconds);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '☀️ Sun Timer Running',
                body: `${formattedRemaining} remaining • Ends at ${timeString}`,
                sound: false,
                sticky: Platform.OS === 'android',
            },
            trigger: null, // Immediate
        });
    } catch (error) {
        console.log('Progress notification error:', error?.message || error);
    }
};
/**
 * Schedule inactivity reminder (24 hours from now)
 * Cancels any existing inactivity reminder first
 */
export const scheduleInactivityReminder = async () => {
    try {
        // Cancel existing inactivity reminders
        const scheduled = await getScheduledNotifications();
        const inactivityId = scheduled.find(n => n.content?.title?.includes('miss you'))?.identifier;
        if (inactivityId) {
            await cancelNotification(inactivityId);
        }

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'We miss you! ☀️',
                body: 'You haven\'t tracked your sun exposure today. Stay safe!',
                sound: true,
            },
            trigger: {
                type: 'timeInterval',
                seconds: 24 * 60 * 60, // 24 hours
                repeats: false,
            },
        });
        console.log('📅 Scheduled inactivity reminder for 24h from now');
        return id;
    } catch (error) {
        console.log('Inactivity reminder error:', error?.message || error);
        return null;
    }
};

/**
 * Schedule safe sun exposure reminder
 * Only schedules if within sun hours (10 AM - 4 PM) or upcoming
 */
export const scheduleSunExposureReminder = async (uvIndex) => {
    try {
        // Don't schedule if UV is 0 (night/dark) or Extreme (unsafe?)
        // Requirement says "UV > 0"
        if (uvIndex === 0) return null;

        const now = new Date();
        const hour = now.getHours();

        // Only schedule if it's morning/midday (e.g., before 3 PM)
        if (hour >= 15) return null; // Too late for "good time" reminder today

        // Check if we already have one
        const scheduled = await getScheduledNotifications();
        const existingId = scheduled.find(n => n.content?.title?.includes('Safe Sun'))?.identifier;
        if (existingId) return existingId;

        // Schedule for 11:00 AM if it's before 11, else Immediate (if UV good)
        // Or simplified: If UvIndex is good (3-7), remind now?
        // Requirement 1: "Morning to Evening".
        // Let's schedule for 11 AM daily?
        // Or if it's already past 11 AM, schedule for tomorrow?
        // Let's go with: If it's between 10 AM and 2 PM, and user hasn't tracked, show reminder?
        // But app needs to be closed.

        // Strategy: Schedule a notification at 11 AM (or 1 hour from now) if checked in morning.

        let trigger = { hour: 11, minute: 0, repeats: true };
        if (hour >= 11) {
            // It's after 11 AM. Schedule for tomorrow 11 AM.
            // Default daily trigger handles "next occurrence".
        }

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Safe Sun Time ☀️',
                body: 'It\'s a good time to get safe sun exposure. Check UV levels now!',
                sound: true,
            },
            trigger: {
                type: 'daily',
                hour: 11,
                minute: 0,
            },
        });
        return id;
    } catch (error) {
        console.log('Sun reminder error:', error?.message || error);
        return null;
    }
};
