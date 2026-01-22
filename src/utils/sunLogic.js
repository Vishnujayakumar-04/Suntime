/**
 * Sun Logic Algorithm - SAFE & REALISTIC IMPLEMENTATION
 * Based on dermatology guidelines for safe sun exposure
 */

/**
 * Get base time in minutes based on UV Index
 * Represents time for Skin Type I to burn without protection
 */
const getBaseTime = (uvIndex) => {
    if (uvIndex < 1) return 120;
    if (uvIndex <= 2) return 60;
    if (uvIndex <= 4) return 45;
    if (uvIndex <= 6) return 30;
    if (uvIndex <= 8) return 15; // Very High
    if (uvIndex <= 10) return 10;
    return 5; // Extreme
};

/**
 * Get skin type multiplier (Fitzpatrick Scale)
 * Estimates relative time to burn compared to Type I
 * Type VI is naturally much more protected (~10-15x), but we cap at 8x for safety margin.
 */
const getSkinMultiplier = (skinType) => {
    const multipliers = {
        1: 1.0,  // Type I - Very Fair (Baseline)
        2: 1.5,  // Type II
        3: 2.0,  // Type III
        4: 3.0,  // Type IV
        5: 5.0,  // Type V
        6: 8.0,  // Type VI
    };
    return multipliers[skinType] || 1.0;
};

/**
 * Calculate environment protection factor
 */
const getProtectionFactor = (isCloudy, hasSunscreen) => {
    let factor = 1.0;
    if (isCloudy) factor *= 1.5;      // Clouds extend safe time (~50% longer)
    if (hasSunscreen) factor *= 10.0; // SPF (Assume imperfect application, so 10x not 30x/50x)
    // IMPORTANT: In "Safe Time" calc, we MULTIPLY base time by this factor.
    // In "Exposure Dose" calc, we DIVIDE actual time by this factor.
    return factor;
};

/**
 * Calculate safe sun exposure time - MAIN FUNCTION
 */
export const calculateSafeTime = (uvIndex, skinType, isCloudy = false, hasSunscreen = false) => {
    const baseTime = getBaseTime(uvIndex);
    const skinMultiplier = getSkinMultiplier(skinType);
    const protectionFactor = getProtectionFactor(isCloudy, hasSunscreen);

    // Formula: BaseTime * SkinType * Protection
    // Example: UV 6 (Base 30m) * Type 3 (2x) * No SPF = 60 mins
    const safeTime = baseTime * skinMultiplier * protectionFactor;

    // Hard Cap at 300 minutes (5 hours) to prevent "infinity" or unsafe duration encouragement
    const clampedTime = Math.max(2, Math.min(300, Math.round(safeTime)));

    return clampedTime;
};

/**
 * Get skin type description
 */
export const getSkinTypeDescription = (skinType) => {
    const descriptions = {
        1: 'Type I - Very Fair (Always burns)',
        2: 'Type II - Fair (Usually burns)',
        3: 'Type III - Medium (Sometimes burns)',
        4: 'Type IV - Olive (Rarely burns)',
        5: 'Type V - Brown (Very rarely burns)',
        6: 'Type VI - Dark Brown (Never burns)',
    };
    return descriptions[skinType] || 'Unknown';
};

/**
 * Get UV level category
 */
export const getUVCategory = (uvIndex) => {
    if (uvIndex < 3) return { level: 'Low', color: '#4CAF50' };
    if (uvIndex < 6) return { level: 'Moderate', color: '#FFB800' };
    if (uvIndex < 8) return { level: 'High', color: '#FF9800' };
    if (uvIndex < 11) return { level: 'Very High', color: '#FF5722' };
    return { level: 'Extreme', color: '#9C27B0' };
};

/**
 * Calculate Normalized Exposure Score
 * Formula: (ActualDose / SafeDose) * 100
 * Score 100 = Reached Safe Limit (Optimal/Max Safe)
 */
export const calculateExposureScore = (uvIndex, durationMinutes, skinType, isCloudy, hasSunscreen) => {
    // 1. Calculate Safe Limit (in minutes) for this specific condition
    // We re-calculate safe time strictly for the user's skin type,
    // BUT we treat Protection (Sunscreen/Clouds) as reducing the INCOMING dose, 
    // rather than increasing the user's limit.
    // Mathematically equivalent:
    // Limit = Base * Skin
    // Dose = (UV * Time) / Protection
    // Score = (Dose / Limit) * 100

    const baseTimeLimit = getBaseTime(uvIndex) * getSkinMultiplier(skinType);
    const protectionFactor = getProtectionFactor(isCloudy, hasSunscreen);

    // Effective Duration (Reducing effective time if protected)
    const effectiveDuration = durationMinutes / protectionFactor;

    // Score Calculation
    // If EffectiveDuration == BaseTimeLimit, Score = 100.
    const score = (effectiveDuration / baseTimeLimit) * 100;
    const normalizedScore = Math.round(score);

    // Classification
    let status = 'Low';
    let recommendation = 'Get more sunlight';

    if (normalizedScore > 120) {
        status = 'Excessive';
        recommendation = 'Reduce exposure immediately';
    } else if (normalizedScore > 80) {
        status = 'High';
        recommendation = 'Seek shade soon';
    } else if (normalizedScore >= 40) {
        status = 'Optimal';
        recommendation = 'Maintain this routine';
    }

    // Raw Exposure (Standard Erythemal Dose approx proxy)
    // Just returning effective duration as "Raw Exposure Equivalent Minutes"
    const rawExposure = parseFloat(effectiveDuration.toFixed(1));

    return {
        rawExposure,
        score: normalizedScore,
        status,
        recommendation
    };
};

/**
 * Vitamin D Report Assessment
 * Validates and classifies blood test results
 */
export const assessVitaminD = (level) => {
    if (level === null || level === undefined || isNaN(level)) {
        return null; // No data
    }

    // Safety Validation
    if (level < 0 || level > 200) {
        // Unrealistic range for ng/mL usually
        // Assuming ng/mL units based on standard tests (Example: 20-50 ng/mL is normal)
        // If nmol/L, values would be ~2.5x higher. 
        // We will assume standard ng/mL for now or simple numeric range 0-100 logic requested.
        // User Request: "<12 Severe, 12-20 Deficiency..." -> These are ng/mL typical values.
        return { valid: false, message: 'Value out of expected range' };
    }

    let status = '';
    let color = '';
    let advice = '';

    if (level < 12) {
        status = 'Severe Deficiency';
        color = '#D32F2F'; // Red
        advice = 'Consult a doctor. Increase safe sun exposure.';
    } else if (level < 20) {
        status = 'Deficiency';
        color = '#F57C00'; // Orange
        advice = 'Below healthy levels. More sun recommended.';
    } else if (level < 30) {
        status = 'Insufficient';
        color = '#FBC02D'; // Yellow
        advice = 'Moderate levels. Improve slightly.';
    } else if (level <= 50) {
        status = 'Sufficient';
        color = '#4CAF50'; // Green
        advice = 'Healthy level! Maintain your routine.';
    } else {
        status = 'High';
        color = '#1976D2'; // Blue
        advice = 'High levels. You can reduce sun exposure.';
    }

    return {
        valid: true,
        level,
        status,
        color,
        advice
    };
};
