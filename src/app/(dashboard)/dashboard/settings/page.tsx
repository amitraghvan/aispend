'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  User as UserIcon, 
  Building, 
  Save, 
  Lock, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  Button, 
  Card, 
  Input, 
  Select, 
  FadeIn
} from '@/components/ui';

export default function SettingsPage() {
  const { user, organization, refresh } = useAuth();
  
  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Organization state
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [employeeCount, setEmployeeCount] = useState('10-50');
  const [orgError, setOrgError] = useState('');
  const [orgSuccess, setOrgSuccess] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);
    setProfileLoading(true);

    try {
      // For now, simulate success or make a dummy request
      // (Supabase metadata update or mock session update)
      const mockSessionStr = localStorage.getItem('aispend_mock_session');
      if (mockSessionStr) {
        const mockSession = JSON.parse(mockSessionStr);
        mockSession.name = profileName;
        localStorage.setItem('aispend_mock_session', JSON.stringify(mockSession));
      }
      
      await refresh();
      setProfileSuccess(true);
    } catch (err) {
      setProfileError('Failed to update profile');
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    setPasswordLoading(true);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    try {
      // Simulate password change
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError('Failed to update password');
      console.error(err);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError('');
    setOrgSuccess(false);
    setOrgLoading(true);

    try {
      const mockSessionStr = localStorage.getItem('aispend_mock_session');
      if (mockSessionStr) {
        const mockSession = JSON.parse(mockSessionStr);
        mockSession.organization.name = orgName;
        localStorage.setItem('aispend_mock_session', JSON.stringify(mockSession));
      }

      await refresh();
      setOrgSuccess(true);
    } catch (err) {
      setOrgError('Failed to update organization details');
      console.error(err);
    } finally {
      setOrgLoading(false);
    }
  };

  return (
    <FadeIn className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Manage your personal profile, passwords, and organization settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation / Intro sidebar info */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-[var(--primary)]" />
              Profile details
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Your name, email address, and avatar image details.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building className="w-5 h-5 text-[var(--primary)]" />
              Workspace info
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Organization name, size, and settings. Changes affect all members.
            </p>
          </div>
        </div>

        {/* Settings Forms (Main Column) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Profile Form */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[var(--muted-foreground)]" />
              Personal Profile
            </h2>

            {profileSuccess && (
              <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Profile updated successfully</span>
              </div>
            )}
            {profileError && (
              <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input
                id="profile-email"
                label="Email Address"
                type="email"
                value={user?.email || ''}
                disabled
                hint="Your email address is managed by your organization administrator"
              />
              <Input
                id="profile-name"
                label="Full Name"
                type="text"
                placeholder="Jane Smith"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
              />
              <Button type="submit" disabled={profileLoading} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {profileLoading ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </Card>

          {/* Organization Form */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-[var(--muted-foreground)]" />
              Organization Settings
            </h2>

            {orgSuccess && (
              <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Organization details updated successfully</span>
              </div>
            )}
            {orgError && (
              <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{orgError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateOrg} className="space-y-4">
              <Input
                id="org-name"
                label="Organization / Company Name"
                type="text"
                placeholder="Acme Corp"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
              <Select
                id="org-size"
                label="Team Size"
                options={[
                  { value: '1-10', label: '1 - 10 employees' },
                  { value: '10-50', label: '10 - 50 employees' },
                  { value: '50-250', label: '50 - 250 employees' },
                  { value: '250+', label: '250+ employees' },
                ]}
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
              />
              <Button type="submit" disabled={orgLoading} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {orgLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Card>

          {/* Password Form */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--muted-foreground)]" />
              Change Password
            </h2>

            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Password updated successfully</span>
              </div>
            )}
            {passwordError && (
              <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <Input
                id="current-password"
                label="Current Password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                id="new-password"
                label="New Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <Input
                id="confirm-password"
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" disabled={passwordLoading} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </FadeIn>
  );
}
