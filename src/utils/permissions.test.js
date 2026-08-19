import { describe, expect, it } from 'vitest';
import { can, canAny, ROLE_PERMISSIONS } from '@/utils/permissions.js';

describe('can', () => {
  it('grants an admin every permission', () => {
    expect(can('admin', 'patients', 'delete')).toBe(true);
    expect(can('admin', 'reports', 'view')).toBe(true);
    expect(can('admin', 'billing', 'delete')).toBe(true);
    expect(can('admin', 'audit', 'view')).toBe(true);
  });

  it('enforces the receptionist read-mostly matrix', () => {
    expect(can('receptionist', 'patients', 'view')).toBe(true);
    expect(can('receptionist', 'patients', 'create')).toBe(true);
    expect(can('receptionist', 'patients', 'update')).toBe(true);
    expect(can('receptionist', 'patients', 'delete')).toBe(false);

    expect(can('receptionist', 'doctors', 'view')).toBe(true);
    expect(can('receptionist', 'doctors', 'create')).toBe(false);

    expect(can('receptionist', 'appointments', 'view')).toBe(true);
    expect(can('receptionist', 'appointments', 'delete')).toBe(false);

    expect(can('receptionist', 'billing', 'collect_payment')).toBe(true);
    expect(can('receptionist', 'billing', 'delete')).toBe(false);

    expect(can('receptionist', 'reports', 'view')).toBe(false);
    expect(can('receptionist', 'inventory', 'view')).toBe(false);
    expect(can('receptionist', 'staff', 'view')).toBe(false);
  });

  it('grants staff full operational access with read-only admin modules', () => {
    expect(can('staff', 'patients', 'delete')).toBe(true);
    expect(can('staff', 'doctors', 'create')).toBe(true);
    expect(can('staff', 'appointments', 'delete')).toBe(true);

    expect(can('staff', 'billing', 'view')).toBe(true);
    expect(can('staff', 'billing', 'delete')).toBe(false);

    expect(can('staff', 'inventory', 'view')).toBe(true);
    expect(can('staff', 'inventory', 'create')).toBe(false);
    expect(can('staff', 'staff', 'view')).toBe(true);
    expect(can('staff', 'staff', 'delete')).toBe(false);

    expect(can('staff', 'reports', 'view')).toBe(true);
    expect(can('staff', 'departments', 'create')).toBe(false);
  });

  it('treats unknown/legacy roles as staff-level operational users', () => {
    expect(can('doctor', 'patients', 'delete')).toBe(true);
    expect(can('nurse', 'billing', 'collect_payment')).toBe(true);
    expect(can('pharmacist', 'reports', 'view')).toBe(true);
    expect(can('user', 'appointments', 'create')).toBe(true);
    expect(can(null, 'patients', 'view')).toBe(true);
  });

  it('denies unknown modules/actions', () => {
    expect(can('staff', 'audit', 'view')).toBe(false);
    expect(can('receptionist', 'payments', 'refund')).toBe(false);
    expect(can('staff', 'patients', 'explode')).toBe(false);
  });
});

describe('canAny', () => {
  it('returns true for any module the role can touch', () => {
    expect(canAny('admin', 'patients')).toBe(true);
    expect(canAny('staff', 'billing')).toBe(true);
    expect(canAny('staff', 'inventory')).toBe(true);
    expect(canAny('receptionist', 'doctors')).toBe(true);
  });

  it('returns false for modules the role has no access to', () => {
    expect(canAny('receptionist', 'reports')).toBe(false);
    expect(canAny('receptionist', 'inventory')).toBe(false);
    expect(canAny('receptionist', 'staff')).toBe(false);
    expect(canAny('staff', 'audit')).toBe(false);
  });

  it('admin bypasses the matrix', () => {
    expect(canAny('admin', 'anything')).toBe(true);
  });
});

describe('ROLE_PERMISSIONS', () => {
  it('defines staff and receptionist maps only', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(['receptionist', 'staff']);
  });
});