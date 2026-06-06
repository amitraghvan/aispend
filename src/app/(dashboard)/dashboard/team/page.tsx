'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Mail
} from 'lucide-react';
import { 
  Button, 
  Card, 
  Input, 
  Select, 
  Badge, 
  FadeIn
} from '@/components/ui';

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  status: 'ACTIVE' | 'PENDING';
}

export default function TeamPage() {
  const { user, role } = useAuth();
  
  // Roles permissions check
  const isAuthorized = role === 'OWNER' || role === 'ADMIN';

  const [members, setMembers] = useState<TeamMember[]>([]);

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadMembers = async () => {
    try {
      const res = await fetch('/api/team/members');
      if (res.ok) {
        const { data } = await res.json();
        setMembers(data || []);
      } else {
        setErrorMsg('Failed to load team members');
      }
    } catch (err) {
      setErrorMsg('An error occurred while loading team members');
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      loadMembers();
    });
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(true);

    if (!isAuthorized) {
      setErrorMsg('You do not have permission to invite members');
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const result = await res.json();

      if (res.ok) {
        setSuccessMsg(`Invitation successfully sent to ${inviteEmail}`);
        setInviteEmail('');
        loadMembers(); // Refresh list to see the pending invite
      } else {
        setErrorMsg(result.error?.message || 'Failed to invite member');
      }
    } catch (err) {
      setErrorMsg('Failed to invite member');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!isAuthorized) return;
    setErrorMsg('');
    setSuccessMsg('');
    
    // Find the member to make sure they're not removing the owner
    const member = members.find(m => m.id === id);
    if (member?.role === 'OWNER') {
      setErrorMsg('The workspace owner cannot be removed');
      return;
    }

    try {
      const res = await fetch(`/api/team/members/${id}`, {
        method: 'DELETE',
      });

      const result = await res.json();

      if (res.ok) {
        setSuccessMsg(member?.status === 'PENDING' ? 'Invitation revoked' : 'Member removed from workspace');
        loadMembers();
      } else {
        setErrorMsg(result.error?.message || 'Failed to remove member');
      }
    } catch (err) {
      setErrorMsg('Failed to remove member');
      console.error(err);
    }
  };

  // Import useEffect if not imported
  // (We'll check imports at the top of the file)

  return (
    <FadeIn className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Invite colleagues, assign roles, and manage workspace access
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Invite Form (Only visible to OWNER and ADMIN) */}
        {isAuthorized && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[var(--primary)]" />
                Invite Team Member
              </h2>

              {successMsg && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleInvite} className="space-y-4">
                <Input
                  id="invite-email"
                  label="Email Address"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={actionLoading}
                />
                <Select
                  id="invite-role"
                  label="Workspace Role"
                  options={[
                    { value: 'MEMBER', label: 'Member (View & Run Audits)' },
                    { value: 'ADMIN', label: 'Admin (Manage Team & Settings)' },
                  ]}
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                  disabled={actionLoading}
                />
                <Button type="submit" disabled={actionLoading || !inviteEmail} className="w-full flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  {actionLoading ? 'Sending Invite...' : 'Send Invitation'}
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* Right Column: Members List */}
        <div className={`${isAuthorized ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--muted-foreground)]" />
                Workspace Members
              </h2>
              <Badge variant="outline">{members.length} Total</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs text-[var(--muted-foreground)] uppercase font-semibold">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4">Status</th>
                    {isAuthorized && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-sm">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="py-4 px-4 font-medium">
                        <div>
                          <p className="text-sm font-semibold">{member.name ?? 'Invited User'}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{member.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-xs uppercase flex items-center gap-1.5 mt-2.5">
                        <Shield className="w-3.5 h-3.5 text-[var(--primary)]" />
                        {member.role}
                      </td>
                      <td className="py-4 px-4 text-[var(--muted-foreground)] text-xs">{member.joinedAt}</td>
                      <td className="py-4 px-4">
                        <Badge variant={member.status === 'ACTIVE' ? 'success' : 'warning'}>
                          {member.status}
                        </Badge>
                      </td>
                      {isAuthorized && (
                        <td className="py-4 px-4 text-right">
                          {member.role !== 'OWNER' && member.email !== user?.email ? (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Remove Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </FadeIn>
  );
}
