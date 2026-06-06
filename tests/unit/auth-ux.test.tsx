import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import Navbar from '@/components/Navbar';
import TeamPage from '@/app/(dashboard)/dashboard/team/page';
import HomePage from '@/app/page';
import { useAuth } from '@/lib/auth/auth-context';

// Mock the auth context
vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

// Mock Framer Motion to avoid animation errors in jsdom
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
    h1: ({ children, className, ...props }: any) => <h1 className={className} {...props}>{children}</h1>,
    p: ({ children, className, ...props }: any) => <p className={className} {...props}>{children}</p>,
    section: ({ children, className, ...props }: any) => <section className={className} {...props}>{children}</section>,
    button: ({ children, className, ...props }: any) => <button className={className} {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  FadeInView: ({ children }: any) => <>{children}</>,
}));

describe('Auth UX Integrations', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Navbar Auth State Integration', () => {
    it('renders Spinner when auth state is loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        organization: null,
        role: null,
        loading: true,
        logout: vi.fn(),
        refresh: vi.fn(),
      });

      const { container } = render(<Navbar />);
      expect(container.querySelector('.animate-spin')).toBeTruthy();
    });

    it('renders login, signup, and free audit when user is logged out', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        organization: null,
        role: null,
        loading: false,
        logout: vi.fn(),
        refresh: vi.fn(),
      });

      render(<Navbar />);
      
      // Desktop and mobile navigation showing guest triggers
      expect(screen.getByText('Login')).toBeTruthy();
      expect(screen.getByText('Sign Up')).toBeTruthy();
      expect(screen.getAllByText('Start Free Audit').length).toBeGreaterThan(0);

      // Verify that Dashboard, Settings, Team links are NOT visible in desktop menu
      expect(screen.queryByText('Dashboard')).toBeNull();
      expect(screen.queryByText('Workspace Settings')).toBeNull();
    });

    it('renders dashboard links when user is logged in', () => {
      const mockUser = {
        id: 'user-123',
        email: 'alex@company.com',
        name: 'Alex Rivera',
        avatarUrl: null,
      };
      const mockOrg = {
        id: 'org-456',
        name: 'Rivera Labs',
        slug: 'rivera-labs',
      };
      
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        organization: mockOrg,
        role: 'ADMIN',
        loading: false,
        logout: vi.fn(),
        refresh: vi.fn(),
      });

      render(<Navbar />);

      // Verify desktop links
      expect(screen.getByText('Dashboard')).toBeTruthy();
      expect(screen.getByText('Settings')).toBeTruthy();
      expect(screen.getByText('Team')).toBeTruthy();

      // Verify guest links are not shown
      expect(screen.queryByText('Login')).toBeNull();
    });
  });

  describe('Landing Page Auth State CTA Integration', () => {
    it('shows Go to Dashboard when authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'u1', email: 'u1@company.com', name: 'User 1', avatarUrl: null },
        organization: { id: 'o1', name: 'Org 1', slug: 'org-1' },
        role: 'OWNER',
        loading: false,
        logout: vi.fn(),
        refresh: vi.fn(),
      });

      render(<HomePage />);
      
      expect(screen.getByText('Go to Dashboard')).toBeTruthy();
      expect(screen.getByText('Start New Audit')).toBeTruthy();
      expect(screen.queryByText('See How It Works')).toBeNull();
    });

    it('shows Start Free Audit when unauthenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        organization: null,
        role: null,
        loading: false,
        logout: vi.fn(),
        refresh: vi.fn(),
      });

      render(<HomePage />);
      
      expect(screen.getAllByText('Start Free Audit').length).toBeGreaterThan(0);
      expect(screen.getByText('See How It Works')).toBeTruthy();
      expect(screen.queryByText('Go to Dashboard')).toBeNull();
    });
  });

  describe('Team Page Role-Based Access Controls', () => {
    it('hides invitation form for MEMBER role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'u1', email: 'member@company.com', name: 'User Member', avatarUrl: null },
        organization: { id: 'o1', name: 'Org 1', slug: 'org-1' },
        role: 'MEMBER',
        loading: false,
        logout: vi.fn(),
        refresh: vi.fn(),
      });

      render(<TeamPage />);
      
      expect(screen.queryByText('Invite Team Member')).toBeNull();
      expect(screen.queryByText('Workspace Role')).toBeNull();
    });

    it('renders invitation form for ADMIN role', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'u1', email: 'admin@company.com', name: 'User Admin', avatarUrl: null },
        organization: { id: 'o1', name: 'Org 1', slug: 'org-1' },
        role: 'ADMIN',
        loading: false,
        logout: vi.fn(),
        refresh: vi.fn(),
      });

      render(<TeamPage />);
      
      expect(screen.getByText('Invite Team Member')).toBeTruthy();
      expect(screen.getByText('Workspace Role')).toBeTruthy();
    });
  });
});
