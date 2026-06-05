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
 * Validates date of birth — must be a valid date and not in the future
 * @param {string} dob - Date of birth in YYYY-MM-DD format
 * @returns {boolean} True if valid, false otherwise
 * @example
 * validateDateOfBirth('1990-05-15') // true
 * validateDateOfBirth('2099-01-01') // false
 */
export function validateDateOfBirth(dob) {
    if (!dob) return false;

    const date = new Date(dob);
    const now = new Date();

    if (isNaN(date.getTime())) {
        return false;
    }

    if (date.getTime() > now.getTime()) {
        return false ;
    }

    return true;
}