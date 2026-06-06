'use client';

import { useState } from 'react';
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

  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: user?.name || 'Jane Smith',
      email: user?.email || 'jane@company.com',
      role: (role as 'OWNER' | 'ADMIN' | 'MEMBER') || 'OWNER',
      joinedAt: '2026-05-08',
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Bob Miller',
      email: 'bob@company.com',
      role: 'ADMIN',
      joinedAt: '2026-05-24',
      status: 'ACTIVE',
    },
    {
      id: '3',
      name: 'Alice Johnson',
      email: 'alice@company.com',
      role: 'MEMBER',
      joinedAt: '2026-06-05',
      status: 'ACTIVE',
    },
  ]);

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!isAuthorized) {
      setErrorMsg('You do not have permission to invite members');
      setLoading(false);
      return;
    }

    // Check if email already exists
    if (members.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      setErrorMsg('User is already a member of this workspace');
      setLoading(false);
      return;
    }

    try {
      const newMember: TeamMember = {
        id: `mock-member-${Date.now()}`,
        name: null,
        email: inviteEmail,
        role: inviteRole,
        joinedAt: new Date().toLocaleDateString(),
        status: 'PENDING',
      };

      setMembers([...members, newMember]);
      setSuccessMsg(`Invitation successfully sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err) {
      setErrorMsg('Failed to invite member');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (id: string) => {
    if (!isAuthorized) return;
    
    // Find the member to make sure they're not removing the owner
    const member = members.find(m => m.id === id);
    if (member?.role === 'OWNER') {
      setErrorMsg('The workspace owner cannot be removed');
      return;
    }

    setMembers(members.filter(m => m.id !== id));
    setSuccessMsg('Member removed from workspace');
  };

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
                  disabled={loading}
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
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !inviteEmail} className="w-full flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  {loading ? 'Sending Invite...' : 'Send Invitation'}
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
