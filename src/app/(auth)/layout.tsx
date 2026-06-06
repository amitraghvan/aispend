'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

/**
 * Auth Layout — Centered card design for login/signup/forgot-password.
 * No navbar, minimal chrome, focus on the form.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold">AI Spend</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-[var(--muted-foreground)]">
        &copy; {new Date().getFullYear()} AI Spend Intelligence. All rights reserved.
      </p>
    </div>
  );
}
