'use client';

import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { Mail, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  return (
    <Card className="p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <Mail className="w-8 h-8 text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Check your email</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        We sent a verification link to your email address.
        Click the link in the email to activate and verify your account.
      </p>
      <Link href="/login">
        <Button variant="outline" className="w-full">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Button>
      </Link>
    </Card>
  );
}
