import { useEffect, useState } from 'react';
import {
  BiBriefcaseAlt2,
  BiCalendar,
  BiEnvelope,
  BiLockAlt,
  BiPhone,
  BiSave,
  BiUserCircle,
} from 'react-icons/bi';
import Spinner from '@/components/ui/Spinner.jsx';
import WidgetHeader from '@/components/dashboard/WidgetHeader.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { getRoleLabel, getStatusLabel, validatePassword } from '@/utils/auth.js';
import {
  fetchOwnProfile,
  updateOwnProfile,
  verifyPassword,
} from '@/services/profile.js';

function initialsOf(name) {
  return String(name || '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

function formatDate(value) {
  if (!value) return '—';
  const raw = String(value);
  const d = new Date(raw.length <= 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="profile-info-item">
      <span className="profile-info-icon">
        <Icon />
      </span>
      <div>
        <span className="profile-info-label">{label}</span>
        <strong className="profile-info-value">{value || '—'}</strong>
      </div>
    </div>
  );
}

const EMPTY_FORM = { full_name: '', phone: '', designation: '' };
const EMPTY_PW = { currentPassword: '', newPassword: '', confirmPassword: '' };

function Profile() {
  const { user, profile, refreshProfile, updatePassword } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [pwForm, setPwForm] = useState(EMPTY_PW);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOwnProfile(user?.id)
      .then((own) => {
        if (cancelled) return;
        setProfileData(own);
        setForm({
          full_name: own?.full_name ?? '',
          phone: own?.phone ?? '',
          designation: own?.designation ?? '',
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load profile:', err);
          setError('Unable to load your profile.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleField = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        designation: form.designation.trim() || null,
      };
      const updated = await updateOwnProfile(user.id, payload);
      setProfileData(updated);
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldPw = (e) => {
    setPwForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    const passwordError = validatePassword(pwForm.newPassword);
    if (passwordError) {
      setPwError(passwordError);
      return;
    }
    setPwSaving(true);
    setPwError('');
    setPwSaved(false);
    try {
      await verifyPassword(user.email, pwForm.currentPassword);
      await updatePassword(pwForm.newPassword);
      setPwForm(EMPTY_PW);
      setPwSaved(true);
    } catch (err) {
      console.error('Failed to change password:', err);
      setPwError(err?.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="content">
        <div className="loader-center loader-center--padded">
          <Spinner />
        </div>
      </main>
    );
  }

  const displayName = profileData?.full_name || profile?.full_name || 'User';
  const roleLabel = getRoleLabel(profileData?.role || profile?.role);
  const accountStatus = profileData?.status || profile?.status;

  return (
    <main className="content">
      <section className="welcome page-head">
        <div>
          <h1 className="welcome-title">
            <BiUserCircle className="page-title-icon" /> My Profile
          </h1>
          <p className="welcome-sub">Manage your personal details & account security.</p>
        </div>
      </section>

      <div className="profile-layout">
        <aside className="card profile-card">
          <div className="profile-avatar">
            <span className="profile-avatar-initials">{initialsOf(displayName)}</span>
          </div>
          <h2 className="profile-card-name">{displayName}</h2>
          <span className="profile-role-pill">{roleLabel}</span>
          {accountStatus && (
            <span className={`account-status-pill ${accountStatus}`}>{getStatusLabel(accountStatus)}</span>
          )}

          <div className="profile-card-meta">
            <InfoItem icon={BiEnvelope} label="Email" value={user?.email} />
            <InfoItem icon={BiPhone} label="Phone" value={profileData?.phone} />
            <InfoItem icon={BiBriefcaseAlt2} label="Designation" value={profileData?.designation} />
            <InfoItem icon={BiCalendar} label="Member since" value={formatDate(profileData?.created_at)} />
          </div>
        </aside>

        <div className="profile-main">
          <section className="card widget">
            <WidgetHeader title="Edit Profile" subtitle="Update your personal information" />
            <form className="patient-form" onSubmit={handleSaveProfile}>
              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>Full name *</span>
                  <input name="full_name" value={form.full_name} onChange={handleField} placeholder="e.g. Dr. Riya Sharma" disabled={saving} required />
                </label>
                <label className="form-field">
                  <span>Phone</span>
                  <input name="phone" value={form.phone} onChange={handleField} placeholder="+1 555-0100" disabled={saving} />
                </label>
                <label className="form-field">
                  <span>Designation</span>
                  <input name="designation" value={form.designation} onChange={handleField} placeholder="e.g. Receptionist" disabled={saving} />
                </label>
              </div>

              {error && <div className="page-alert page-alert--danger">{error}</div>}
              {saved && <div className="page-alert page-alert--success">Profile updated successfully.</div>}

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  <BiSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>

          <section className="card widget">
            <WidgetHeader title="Change Password" subtitle="Keep your account secure" />
            <form className="patient-form" onSubmit={handleChangePassword}>
              <div className="form-grid">
                <label className="form-field form-field--full">
                  <span>Current password</span>
                  <input type="password" name="currentPassword" value={pwForm.currentPassword} onChange={handleFieldPw} placeholder="Enter current password" disabled={pwSaving} required autoComplete="current-password" />
                </label>
                <label className="form-field">
                  <span>New password</span>
                  <input type="password" name="newPassword" value={pwForm.newPassword} onChange={handleFieldPw} placeholder="At least 8 characters" disabled={pwSaving} required autoComplete="new-password" />
                </label>
                <label className="form-field">
                  <span>Confirm new password</span>
                  <input type="password" name="confirmPassword" value={pwForm.confirmPassword} onChange={handleFieldPw} placeholder="Re-enter new password" disabled={pwSaving} required autoComplete="new-password" />
                </label>
              </div>

              {pwError && <div className="page-alert page-alert--danger">{pwError}</div>}
              {pwSaved && <div className="page-alert page-alert--success">Password changed successfully.</div>}

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={pwSaving}>
                  <BiLockAlt /> {pwSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Profile;