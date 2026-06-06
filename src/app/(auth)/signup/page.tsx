'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@/components/ui';
import { ArrowRight, Mail, Lock, User, Building2, AlertCircle } from 'lucide-react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const orgSlug = (companyName || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      if (!isSupabaseConfigured()) {
        // Mock mode: simulate successful signup
        const mockUser = {
          id: `mock-${Date.now()}`,
          email,
          name,
          organization: {
            id: `mock-org-${Date.now()}`,
            name: companyName || `${name}'s Organization`,
            slug: orgSlug,
          },
          role: 'OWNER' as const,
        };
        localStorage.setItem('aispend_mock_session', JSON.stringify(mockUser));
        router.push('/dashboard');
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error('Authentication service unavailable');

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            organization_name: companyName || `${name}'s Organization`,
            organization_slug: orgSlug,
            role: 'OWNER',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Mail className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          We sent a verification link to <strong>{email}</strong>.
          Click the link to activate your account.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            Back to Sign In
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Create your account</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Start optimizing your AI spend in minutes
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none mt-3" />
          <Input
            id="signup-name"
            label="Full Name"
            type="text"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="pl-10"
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none mt-3" />
          <Input
            id="signup-email"
            label="Work Email"
            type="email"
            placeholder="jane@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none mt-3" />
          <Input
            id="signup-password"
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="pl-10"
          />
        </div>

        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none mt-3" />
          <Input
            id="signup-company"
            label="Company Name (optional)"
            type="text"
            placeholder="Acme Corp"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading || !name || !email || !password}
        >
          {loading ? 'Creating account...' : 'Create Account'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <p className="mt-4 text-xs text-center text-[var(--muted-foreground)]">
        By signing up, you agree to our Terms of Service and Privacy Policy.
      </p>

      <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--primary)] font-medium hover:underline">
          Sign in
        </Link>
      </div>

      {!isSupabaseConfigured() && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs text-center">
          Demo mode — Supabase not configured. Signup is simulated.
        </div>
      )}
    </Card>
  );
}
