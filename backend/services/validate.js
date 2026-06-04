export function validateEmail(email){
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email);
}

export function isStrongPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])/;

    return passwordRegex.test(password);
}

export function validatePasswordLength(password){
    return password.length >= 8;
}