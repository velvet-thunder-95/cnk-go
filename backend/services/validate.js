/**
 * Validates the format of an email address
 * @param {string} email - The email address to validate
 * @returns {boolean} True if email format is valid, false otherwise
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid-email')    // false
 */
export function validateEmail(email){
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email);
}

/**
 * Checks if a password meets strength requirements
 * @param {string} password - The password to validate
 * @returns {boolean} True if password is strong, false otherwise
 * @description Password must contain at least:
 * - One lowercase letter (a-z)
 * - One uppercase letter (A-Z)
 * - One number (0-9)
 * - One special character (@$!%*?#&)
 * @example
 * isStrongPassword('Secure@123') // true
 * isStrongPassword('weakpass')   // false
 */
export function isStrongPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])/;

    return passwordRegex.test(password);
}

/**
 * Validates that a password meets the minimum length requirement
 * @param {string} password - The password to validate
 * @returns {boolean} True if password is at least 8 characters, false otherwise
 * @example
 * validatePasswordLength('short')        // false
 * validatePasswordLength('longenough')   // true
 */
export function validatePasswordLength(password){
    return password.length >= 8;
}