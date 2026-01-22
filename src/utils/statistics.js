/**
 * Calculate user statistics from session logs
 * @param {Array} logs - Array of session objects from Firestore
 * @returns {Object} - { totalSessions, totalMinutes, currentStreak, todayMinutes, monthlyTotal, averagePerDay }
 */
export const calculateUserStats = (logs) => {
    if (!logs || logs.length === 0) {
        return {
            totalSessions: 0,
            totalMinutes: 0,
            currentStreak: 0,
            todayMinutes: 0,
            monthlyTotal: 0,
            averagePerDay: 0
        };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Total Sessions
    const totalSessions = logs.length;

    // 2. Total Exposure Time
    const totalMinutes = logs.reduce((sum, log) => sum + (log.exposureTime || log.duration || 0), 0);

    // 3. Today's Minutes
    const todaySessions = logs.filter(log => {
        const logDate = new Date(log.date);
        const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
        return logDay.getTime() === today.getTime();
    });
    const todayMinutes = todaySessions.reduce((sum, log) => sum + (log.exposureTime || log.duration || 0), 0);

    // 4. Monthly Total
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSessions = logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= firstDayOfMonth;
    });
    const monthlyTotal = monthSessions.reduce((sum, log) => sum + (log.exposureTime || log.duration || 0), 0);

    // 5. Current Streak
    // Logic: Count consecutive days ending yesterday or today.
    // If user has session today, check yesterday, etc.
    // If not today, check yesterday. If yesterday has session, count 1... 
    let streak = 0;

    // Get all unique dates with sessions
    const sessionDates = new Set();
    logs.forEach(log => {
        const d = new Date(log.date);
        sessionDates.add(d.toDateString());
    });

    // Check backwards from today
    let checkDate = new Date(today);
    // If no session today, maybe streak is just preserved from yesterday?
    // Usually strict streak requires today if we check "current" active streak, 
    // but often it allows "yesterday" if today isn't over.
    // Let's simple check: if today has NO session, check if yesterday has session. 
    // If yesterday has NO session, streak is 0.

    // Optimization: If today has session, start check from today.
    // If no session today, start check from yesterday.

    if (!sessionDates.has(checkDate.toDateString())) {
        checkDate.setDate(checkDate.getDate() - 1); // Check yesterday
        if (!sessionDates.has(checkDate.toDateString())) {
            // No session today OR yesterday -> Streak broken/zero
            streak = 0;
        } else {
            // Streak alive from yesterday
            // We count how many consecutive days going back
            while (sessionDates.has(checkDate.toDateString())) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            }
        }
    } else {
        // Session today, count backwards including today
        while (sessionDates.has(checkDate.toDateString())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
    }

    // 6. Average Per Day
    const uniqueDays = sessionDates.size;
    const averagePerDay = uniqueDays > 0 ? Math.round(totalMinutes / uniqueDays) : 0;

    return {
        totalSessions,
        totalMinutes,
        currentStreak: streak,
        todayMinutes,
        monthlyTotal,
        averagePerDay
    };
};
