'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface AuthContextType {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [organization, setOrganization] = useState<AuthContextType['organization']>(null);
  const [role, setRole] = useState<AuthContextType['role']>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      if (!isSupabaseConfigured()) {
        // Mock mode: retrieve session from localStorage
        const mockSessionStr = localStorage.getItem('aispend_mock_session');
        if (mockSessionStr) {
          const mockSession = JSON.parse(mockSessionStr);
          setUser({
            id: mockSession.id,
            email: mockSession.email,
            name: mockSession.name,
            avatarUrl: mockSession.avatarUrl ?? null,
          });
          setOrganization(mockSession.organization);
          setRole(mockSession.role);
        } else {
          setUser(null);
          setOrganization(null);
          setRole(null);
        }
        setLoading(false);
        return;
      }

      // Production mode: fetch session via API
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const { session } = await res.json();
        if (session) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            avatarUrl: session.user.avatarUrl,
          });
          setOrganization({
            id: session.organization.id,
            name: session.organization.name,
            slug: session.organization.slug,
          });
          setRole(session.membership.role);
        } else {
          setUser(null);
          setOrganization(null);
          setRole(null);
        }
      }
    } catch (err) {
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        localStorage.removeItem('aispend_mock_session');
        setUser(null);
        setOrganization(null);
        setRole(null);
        router.push('/login');
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setOrganization(null);
      setRole(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, organization, role, loading, logout, refresh: fetchSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
