// RBAC role helpers. 'admin' has full access; 'receptionist' is
// read-mostly front-desk; everything else (staff, doctor, nurse,
// pharmacist, ...) is treated as a general operational user until a
// future phase activates role-specific behaviour.
export const isAdminRole = (role) => role === 'admin';

const ROLE_LABELS = {
  admin: 'Administrator',
  receptionist: 'Receptionist',
  staff: 'Staff',
  doctor: 'Doctor',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? 'User';
}

const STATUS_LABELS = {
  pending: 'Pending Approval',
  active: 'Active',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? 'Unknown';
}

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
  if (code === 'otp_expired' || lower.includes('otp_expired')) {
    return 'This link has expired. Please request a new one.';
  }
  if (code === 'access_denied' || lower.includes('access_denied')) {
    return 'This password reset link is invalid or has already been used. Please request a new one.';
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

  return null;
}

// Derive a friendly display name from the (Supabase) auth user.
// Prefers the stored full_name; otherwise falls back to the email prefix.
export function getUserDisplay(user) {
  const email = (user?.email ?? '').trim();
  const metaName = ((user?.user_metadata?.full_name || user?.user_metadata?.name) ?? '').trim();
  const emailName = email
    .split('@')[0]
    .trim()
    .replace(/[._-]+/g, ' ')
    .replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));

  const displayName = metaName || emailName || 'User';

  const firstName = displayName.split(' ')[0];

  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => (w[0] ? w[0].toUpperCase() : ''))
    .join('') || 'U';

  return { displayName, firstName, initials, email };
}
