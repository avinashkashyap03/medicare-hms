// RBAC permission matrix — mirrors the approved database matrix in
// supabase/migrations/012_permission_gating.sql (has_permission()).
// This drives the UI only (nav items, buttons, routes). The database
// enforces the same rules at the RLS layer, so this file is a UX layer,
// never the source of truth.
//
// Admin bypasses everything (full access). Receptionist is read-mostly
// front-desk. Staff is general operational access; any legacy role
// (doctor/nurse/pharmacist/user) falls through to the staff map so
// pre-existing accounts keep working until future role phases.

export const ROLE_PERMISSIONS = {
  receptionist: {
    patients: ['view', 'create', 'update'],
    doctors: ['view'],
    appointments: ['view', 'create', 'update'],
    departments: ['view'],
    billing: ['view', 'create', 'update', 'collect_payment'],
    payments: ['view', 'create'],
  },
  staff: {
    patients: ['view', 'create', 'update', 'delete'],
    doctors: ['view', 'create', 'update', 'delete'],
    appointments: ['view', 'create', 'update', 'delete'],
    departments: ['view'],
    billing: ['view', 'create', 'update', 'collect_payment'],
    payments: ['view', 'create'],
    inventory: ['view'],
    pharmacy: ['view'],
    staff: ['view'],
    reports: ['view'],
  },
};

export function can(role, module, action) {
  if (role === 'admin') return true;
  const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.staff;
  return Array.isArray(perms[module]) && perms[module].includes(action);
}

export function canAny(role, module) {
  if (role === 'admin') return true;
  const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.staff;
  return Array.isArray(perms[module]) && perms[module].length > 0;
}