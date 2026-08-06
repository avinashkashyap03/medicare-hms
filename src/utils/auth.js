export function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  return null;
}

export function getFriendlyAuthError(error) {
  const message = error?.message ?? '';
  const code = error?.code ?? '';
  const lower = `${message} ${code}`.toLowerCase();

  if (
    lower.includes('user already registered') ||
    lower.includes('user_already_exists') ||
    lower.includes('email already registered') ||
    lower.includes('duplicate key')
  ) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in. Check your inbox for the confirmation link.';
  }
  if (
    lower.includes('password should be at least') ||
    lower.includes('weak password') ||
    (code === 'weak_password' && lower.includes('password'))
  ) {
    return 'Your password is too weak. Please choose a stronger one.';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    code === 'over_email_send_rate_limit'
  ) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (
    lower.includes('expired') ||
    lower.includes('invalid code') ||
    lower.includes('code has expired') ||
    lower.includes('link has expired')
  ) {
    return 'This link has expired or is invalid. Please request a new one.';
  }
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('failed to fetch')
  ) {
    return 'Network error. Please check your connection and try again.';
  }

  return 'Something went wrong. Please try again.';
}
