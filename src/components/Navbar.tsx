'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  Sparkles, 
  ArrowRight, 
  Menu, 
  X, 
  User as UserIcon, 
  LogOut, 
  Settings, 
  Users, 
  LayoutDashboard,
  Building,
  Shield
} from 'lucide-react';
import { Button, Spinner } from '@/components/ui';

export default function Navbar() {
  const { user, organization, role, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    await logout();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)]/50 bg-[var(--background)]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold">AI Spend</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#how-it-works" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">How It Works</Link>
          <Link href="/#features" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Features</Link>
          <Link href="/#savings" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Savings</Link>
          <Link href="/#faq" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">FAQ</Link>
        </nav>

        {/* Auth Navigation */}
        <div className="hidden md:flex items-center gap-4">
          {loading ? (
            <Spinner className="w-5 h-5 text-[var(--primary)]" />
          ) : user ? (
            // Logged In navbar links & avatar
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/settings" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                Settings
              </Link>
              <Link href="/dashboard/team" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                Team
              </Link>

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-9 h-9 rounded-full bg-[var(--primary)]/10 border border-[var(--border)] flex items-center justify-center text-[var(--primary)] hover:ring-2 hover:ring-[var(--primary)]/20 transition-all focus:outline-none cursor-pointer"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl shadow-black/10 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate text-[var(--foreground)]">{user.name || user.email.split('@')[0]}</p>
                        <p className="text-xs truncate text-[var(--muted-foreground)]">{user.email}</p>
                      </div>
                    </div>

                    {/* Org details */}
                    <div className="py-2.5 px-1 border-b border-[var(--border)] flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <Building className="w-3.5 h-3.5" />
                        <span className="truncate font-medium">{organization?.name || 'My Workspace'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <Shield className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span className="capitalize">{role || 'MEMBER'}</span>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="py-1.5 space-y-0.5">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        <UserIcon className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Workspace Settings
                      </Link>
                      <Link
                        href="/dashboard/team"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        Team
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="pt-2 border-t border-[var(--border)]">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-sm text-red-600 hover:bg-red-500/10 transition-colors text-left cursor-pointer font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Logged Out buttons
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                Login
              </Link>
              <Link href="/signup">
                <Button variant="outline" size="sm">Sign Up</Button>
              </Link>
              <Link href="/audit">
                <Button size="sm">
                  Start Free Audit <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 md:hidden text-[var(--muted-foreground)] hover:text-[var(--foreground)] focus:outline-none cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)]/50 bg-[var(--card)] px-4 py-6 space-y-4 shadow-inner animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-4">
            <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]">How It Works</Link>
            <Link href="/#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Features</Link>
            <Link href="/#savings" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Savings</Link>
            <Link href="/#faq" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]">FAQ</Link>
          </nav>

          <div className="pt-4 border-t border-[var(--border)] space-y-3">
            {loading ? (
              <div className="flex justify-center"><Spinner className="w-5 h-5 text-[var(--primary)]" /></div>
            ) : user ? (
              <>
                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
                  <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold truncate text-[var(--foreground)]">{user.name || user.email.split('@')[0]}</p>
                    <p className="text-xs truncate text-[var(--muted-foreground)]">{user.email}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <Link
                  href="/dashboard/team"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                >
                  <Users className="w-4 h-4" />
                  Team
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-500/10 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-center">Login</Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center">Sign Up</Button>
                </Link>
                <Link href="/audit" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-center gap-2">
                    Start Free Audit <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
