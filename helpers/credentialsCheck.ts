export const check = (email: string, password: string): boolean => {
  if (!email || !password) return false;
  if (!email.includes('@') || !email.includes('.')) return false;
  if (password.length < 8) return false;
  return true;
};
