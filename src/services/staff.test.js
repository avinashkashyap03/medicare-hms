import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.fn();
const fromMock = vi.fn();
const updateMock = vi.fn();

vi.mock('@/services/supabase.js', () => ({
  default: {
    rpc: (...args) => rpcMock(...args),
    from: (...args) => fromMock(...args),
  },
}));

vi.mock('@/services/patients.js', () => ({
  ensureProfile: vi.fn(),
}));

import { approveStaff, fetchAllProfiles, fetchPendingProfiles, setUserRole, setUserStatus } from '@/services/staff.js';

describe('staff approval service', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    updateMock.mockReset();
  });

  describe('approveStaff', () => {
    it('calls the secure admin_approve_staff RPC with email/role/reason', async () => {
      rpcMock.mockResolvedValue({ data: null, error: null });

      await approveStaff('vinay@gmail.com', 'receptionist', 'Approved for reception duties');

      expect(rpcMock).toHaveBeenCalledWith('admin_approve_staff', {
        target_email: 'vinay@gmail.com',
        new_role: 'receptionist',
        reason: 'Approved for reception duties',
      });
      expect(rpcMock).toHaveBeenCalledTimes(1);
    });

    it('never writes profiles.role/status directly from the client', async () => {
      fromMock.mockReturnValue({ update: updateMock });
      rpcMock.mockResolvedValue({ data: null, error: null });

      await approveStaff('vinay@gmail.com', 'receptionist', 'Approved');

      expect(fromMock).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('throws when the RPC returns an error', async () => {
      const error = new Error('Only an active administrator can approve staff');
      rpcMock.mockResolvedValue({ data: null, error });

      await expect(
        approveStaff('vinay@gmail.com', 'receptionist', 'Approved')
      ).rejects.toThrow('Only an active administrator can approve staff');
    });
  });

  describe('fetchPendingProfiles', () => {
    it('reads pending accounts through the admin-only RPC (includes email)', async () => {
      const rows = [
        { id: 'p1', full_name: 'Vinay Dewangan', email: 'vinay@gmail.com', role: 'staff', status: 'pending' },
      ];
      rpcMock.mockResolvedValue({ data: rows, error: null });

      const result = await fetchPendingProfiles();

      expect(rpcMock).toHaveBeenCalledWith('admin_list_pending_profiles');
      expect(result).toEqual(rows);
      expect(fromMock).not.toHaveBeenCalled();
    });

    it('returns an empty list when the RPC yields no data', async () => {
      rpcMock.mockResolvedValue({ data: null, error: null });

      await expect(fetchPendingProfiles()).resolves.toEqual([]);
    });
  });

  describe('fetchAllProfiles', () => {
    it('reads every account through the admin-only RPC (includes email)', async () => {
      const rows = [
        { id: 'p1', full_name: 'Vinay Dewangan', email: 'vinay@gmail.com', role: 'admin', status: 'active' },
        { id: 'p2', full_name: 'Neha', email: 'neha@gmail.com', role: 'receptionist', status: 'pending' },
      ];
      rpcMock.mockResolvedValue({ data: rows, error: null });

      const result = await fetchAllProfiles();

      expect(rpcMock).toHaveBeenCalledWith('admin_list_all_profiles');
      expect(result).toEqual(rows);
      expect(fromMock).not.toHaveBeenCalled();
    });

    it('returns an empty list when the RPC yields no data', async () => {
      rpcMock.mockResolvedValue({ data: null, error: null });

      await expect(fetchAllProfiles()).resolves.toEqual([]);
    });

    it('throws when the RPC returns an error', async () => {
      const error = new Error('Only an active administrator can list profiles');
      rpcMock.mockResolvedValue({ data: null, error });

      await expect(fetchAllProfiles()).rejects.toThrow(
        'Only an active administrator can list profiles'
      );
    });
  });

  describe('setUserStatus', () => {
    it('routes status changes through the admin_set_user_status RPC', async () => {
      rpcMock.mockResolvedValue({ data: null, error: null });

      await setUserStatus('p1', 'deactivated', 'Failed background check');

      expect(rpcMock).toHaveBeenCalledWith('admin_set_user_status', {
        p_target: 'p1',
        p_status: 'deactivated',
        p_reason: 'Failed background check',
      });
    });
  });

  describe('setUserRole', () => {
    it('routes role changes through the admin_set_profile_role RPC', async () => {
      rpcMock.mockResolvedValue({ data: null, error: null });

      await setUserRole('p1', 'admin', 'Promoted to administrator');

      expect(rpcMock).toHaveBeenCalledWith('admin_set_profile_role', {
        p_target: 'p1',
        new_role: 'admin',
        p_reason: 'Promoted to administrator',
      });
    });
  });
});