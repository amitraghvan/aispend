'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Users, 
  Settings, 
  Sparkles, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  Building
} from 'lucide-react';
import { Spinner, Button } from '@/components/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, organization, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      const currentUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center space-y-4">
          <Spinner className="w-8 h-8 text-[var(--primary)] mx-auto" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting...
  }

  const navItems = [
    { href: '/dashboard', label: 'Audits', icon: BarChart3 },
    { href: '/dashboard/team', label: 'Team', icon: Users },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--border)] bg-[var(--card)] shrink-0">
        {/* Workspace Info */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[var(--border)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
            <Building className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-semibold truncate text-[var(--foreground)]">
              {organization?.name ?? 'My Workspace'}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] capitalize truncate">Free Tier</p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-[var(--border)] mt-4">
            <Link href="/audit">
              <Button className="w-full flex items-center justify-center gap-2" size="sm">
                <Sparkles className="w-4 h-4" /> New Audit
              </Button>
            </Link>
          </div>
        </nav>

        {/* Sidebar User Profile & Log Out */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name ?? 'Avatar'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                {user.name ?? user.email.split('@')[0]}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)] truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between h-16 px-6 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              <Building className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {organization?.name ?? 'Workspace'}
            </span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            
            <aside className="relative flex flex-col w-64 max-w-xs bg-[var(--card)] border-r border-[var(--border)] h-full animate-in slide-in-from-left duration-200">
              <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                    <Building className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {organization?.name ?? 'Workspace'}
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
                <div className="pt-4 border-t border-[var(--border)] mt-4">
                  <Link href="/audit" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full flex items-center justify-center gap-2" size="sm">
                      <Sparkles className="w-4 h-4" /> New Audit
                    </Button>
                  </Link>
                </div>
              </nav>

              <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                      {user.name ?? user.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Workspace Main scroll panel */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
