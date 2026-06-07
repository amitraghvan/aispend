'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Input } from '@/components/ui';
import { ArrowRight, Mail, Lock, AlertCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Sign in to your account to continue
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none mt-3" />
          <Input
            id="login-email"
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none mt-3" />
          <Input
            id="login-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-10"
          />
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-[var(--primary)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading || !email || !password}
        >
          {loading ? 'Signing in...' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[var(--primary)] font-medium hover:underline">
          Sign up
        </Link>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="p-8 text-center flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
        </div>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  );
}
