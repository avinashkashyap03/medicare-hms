import { describe, expect, it } from 'vitest';
import {
  validatePassword,
  getFriendlyAuthError,
  getUserDisplay,
  isAdminRole,
  getRoleLabel,
  getStatusLabel,
} from '@/utils/auth.js';

describe('validatePassword', () => {
  it('accepts a strong password', () => {
    expect(validatePassword('Abcdef12')).toBe(null);
  });

  it('rejects missing or too-short passwords', () => {
    expect(validatePassword('')).toBe('Password must be at least 8 characters long.');
    expect(validatePassword('Abc12')).toBe('Password must be at least 8 characters long.');
    expect(validatePassword(null)).toBe('Password must be at least 8 characters long.');
  });

  it('requires an uppercase letter', () => {
    expect(validatePassword('abcdef12')).toContain('uppercase');
  });

  it('requires a lowercase letter', () => {
    expect(validatePassword('ABCDEF12')).toContain('lowercase');
  });

  it('requires a number', () => {
    expect(validatePassword('Abcdefgh')).toContain('number');
  });
});

describe('getFriendlyAuthError', () => {
  it.each([
    [{ message: 'User already registered' }, 'An account with this email already exists.'],
    [{ message: 'user_already_exists' }, 'An account with this email already exists.'],
    [{ message: 'Invalid login credentials' }, 'Incorrect email or password.'],
    [{ message: 'Email not confirmed' }, 'Please confirm your email address'],
    [{ message: 'Password should be at least 6 characters' }, 'Your password is too weak.'],
    [{ code: 'weak_password', message: 'Password is too weak' }, 'Your password is too weak.'],
    [{ message: 'Too many requests. Try again.' }, 'Too many attempts.'],
    [{ code: 'over_email_send_rate_limit' }, 'Too many attempts.'],
    [{ message: 'The code is invalid or has expired' }, 'This link has expired or is invalid.'],
    [{ message: 'Failed to fetch' }, 'Network error.'],
  ])('maps %o to a friendly message', (err, expected) => {
    expect(getFriendlyAuthError(err)).toContain(expected);
  });

  it('returns null for unrecognized errors (so callers can log them)', () => {
    expect(getFriendlyAuthError(new Error('weird internal bug'))).toBe(null);
    expect(getFriendlyAuthError(undefined)).toBe(null);
  });
});

describe('getUserDisplay', () => {
  it('prefers stored full_name', () => {
    const user = { email: 'riya@hospital.com', user_metadata: { full_name: 'Riya Sharma' } };
    const { displayName, firstName, initials } = getUserDisplay(user);
    expect(displayName).toBe('Riya Sharma');
    expect(firstName).toBe('Riya');
    expect(initials).toBe('RS');
  });

  it('falls back to the email prefix and title-cases it', () => {
    const user = { email: 'john.doe@hospital.com' };
    const { displayName, firstName, initials } = getUserDisplay(user);
    expect(displayName).toBe('John Doe');
    expect(firstName).toBe('John');
    expect(initials).toBe('JD');
  });

  it('returns sensible defaults when nothing is available', () => {
    const { displayName, firstName, initials } = getUserDisplay(null);
    expect(displayName).toBe('User');
    expect(firstName).toBe('User');
    expect(initials).toBe('U');
  });
});

describe('isAdminRole', () => {
  it('returns true only for the admin role', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('user')).toBe(false);
    expect(isAdminRole('staff')).toBe(false);
    expect(isAdminRole('doctor')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

describe('getRoleLabel', () => {
  it('labels the admin role as Administrator', () => {
    expect(getRoleLabel('admin')).toBe('Administrator');
  });

  it('labels known roles with their display name', () => {
    expect(getRoleLabel('receptionist')).toBe('Receptionist');
    expect(getRoleLabel('staff')).toBe('Staff');
    expect(getRoleLabel('doctor')).toBe('Doctor');
    expect(getRoleLabel('nurse')).toBe('Nurse');
    expect(getRoleLabel('pharmacist')).toBe('Pharmacist');
  });

  it('falls back to User for unknown or missing roles', () => {
    expect(getRoleLabel('user')).toBe('User');
    expect(getRoleLabel('superadmin')).toBe('User');
    expect(getRoleLabel(null)).toBe('User');
    expect(getRoleLabel(undefined)).toBe('User');
  });
});

describe('getStatusLabel', () => {
  it('labels every account status', () => {
    expect(getStatusLabel('pending')).toBe('Pending Approval');
    expect(getStatusLabel('active')).toBe('Active');
    expect(getStatusLabel('suspended')).toBe('Suspended');
    expect(getStatusLabel('deactivated')).toBe('Deactivated');
  });

  it('falls back to Unknown for unrecognized statuses', () => {
    expect(getStatusLabel('weird')).toBe('Unknown');
    expect(getStatusLabel(null)).toBe('Unknown');
  });
});