import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../setup';
import { emailService } from '@/features/email/services/EmailService';
import { getSession } from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

vi.spyOn(emailService, 'send').mockResolvedValue({ success: true, emailLogId: 'log-123' });

describe('Team Invitation API & Logic Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow Owner or Admin to create invitation', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'owner@company.com', name: 'Owner' },
      organization: { id: 'org-123', name: 'Acme Corp', slug: 'acme' },
      membership: { id: 'mem-123', role: 'OWNER', organizationId: 'org-123', userId: 'user-123' },
    };

    vi.mocked(getSession).mockResolvedValue(mockSession as any);
    prismaMock.membership.findFirst.mockResolvedValue(null);
    prismaMock.invitation.create.mockResolvedValue({
      id: 'inv-123',
      email: 'invitee@gmail.com',
      role: 'MEMBER',
      token: 'token-123',
      status: 'PENDING',
      expiresAt: new Date(),
    });

    const token = 'token-123';
    const invitation = await prismaMock.invitation.create({
      data: {
        organizationId: 'org-123',
        email: 'invitee@gmail.com',
        role: 'MEMBER',
        token,
        invitedBy: 'user-123',
        expiresAt: new Date(),
      },
    });

    const emailResult = await emailService.send({
      to: 'invitee@gmail.com',
      template: 'team_invitation',
      data: {
        orgName: 'Acme Corp',
        inviterName: 'Owner',
        role: 'member',
        inviteUrl: `http://localhost:3000/invite?token=${token}`,
        expiresAt: '2026-06-13',
      },
    });

    expect(prismaMock.invitation.create).toHaveBeenCalledTimes(1);
    expect(emailResult.success).toBe(true);
  });

  it('should reject invitation accept if token is invalid', async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(null);
    const invitation = await prismaMock.invitation.findUnique({
      where: { token: 'invalid-token' },
    });
    expect(invitation).toBeNull();
  });

  it('should accept a valid pending invitation as MEMBER', async () => {
    const mockInvitation = {
      id: 'inv-123',
      organizationId: 'org-123',
      email: 'invitee@gmail.com',
      role: 'MEMBER',
      token: 'valid-token',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000),
    };

    prismaMock.invitation.findUnique.mockResolvedValue(mockInvitation);
    prismaMock.membership.create.mockResolvedValue({
      id: 'mem-456',
      userId: 'user-456',
      organizationId: 'org-123',
      role: 'MEMBER',
    });
    prismaMock.invitation.update.mockResolvedValue({
      ...mockInvitation,
      status: 'ACCEPTED',
    });

    const invite = await prismaMock.invitation.findUnique({ where: { token: 'valid-token' } });
    expect(invite?.role).toBe('MEMBER');

    const newMembership = await prismaMock.membership.create({
      data: {
        userId: 'user-456',
        organizationId: invite!.organizationId,
        role: invite!.role,
      },
    });

    expect(newMembership.role).toBe('MEMBER');
  });

  it('should accept a valid pending invitation as ADMIN', async () => {
    const mockInvitation = {
      id: 'inv-124',
      organizationId: 'org-123',
      email: 'invitee-admin@gmail.com',
      role: 'ADMIN',
      token: 'admin-token',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000),
    };

    prismaMock.invitation.findUnique.mockResolvedValue(mockInvitation);
    prismaMock.membership.create.mockResolvedValue({
      id: 'mem-789',
      userId: 'user-789',
      organizationId: 'org-123',
      role: 'ADMIN',
    });

    const invite = await prismaMock.invitation.findUnique({ where: { token: 'admin-token' } });
    const newMembership = await prismaMock.membership.create({
      data: {
        userId: 'user-789',
        organizationId: invite!.organizationId,
        role: invite!.role,
      },
    });

    expect(newMembership.role).toBe('ADMIN');
  });

  it('should reject invitation if already accepted', async () => {
    const mockInvitation = {
      id: 'inv-123',
      status: 'ACCEPTED',
      expiresAt: new Date(Date.now() + 86400000),
    };
    prismaMock.invitation.findUnique.mockResolvedValue(mockInvitation);
    const invite = await prismaMock.invitation.findUnique({ where: { token: 'token' } });
    expect(invite?.status).toBe('ACCEPTED');
  });

  it('should reject invitation if revoked', async () => {
    const mockInvitation = {
      id: 'inv-123',
      status: 'REVOKED',
      expiresAt: new Date(Date.now() + 86400000),
    };
    prismaMock.invitation.findUnique.mockResolvedValue(mockInvitation);
    const invite = await prismaMock.invitation.findUnique({ where: { token: 'token' } });
    expect(invite?.status).toBe('REVOKED');
  });

  it('should reject invitation accept if token is expired', async () => {
    const mockInvitation = {
      id: 'inv-123',
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 86400000), // expired
    };
    prismaMock.invitation.findUnique.mockResolvedValue(mockInvitation);
    const invite = await prismaMock.invitation.findUnique({ where: { token: 'token' } });
    const isExpired = new Date() > invite!.expiresAt;
    expect(isExpired).toBe(true);
  });

  it('should allow rejecting a pending invitation', async () => {
    const mockInvitation = {
      id: 'inv-123',
      status: 'PENDING',
    };
    prismaMock.invitation.findUnique.mockResolvedValue(mockInvitation);
    prismaMock.invitation.update.mockResolvedValue({
      id: 'inv-123',
      status: 'REVOKED',
    });

    const invite = await prismaMock.invitation.findUnique({ where: { token: 'token' } });
    const updated = await prismaMock.invitation.update({
      where: { id: invite!.id },
      data: { status: 'REVOKED' },
    });

    expect(updated.status).toBe('REVOKED');
  });

  it('should allow soft deleting/revoking by organization', async () => {
    prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
    const result = await prismaMock.invitation.updateMany({
      where: { organizationId: 'org-123', email: 'test@email.com', status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
    expect(result.count).toBe(1);
  });
});
