'use client';

import { useEffect, useState } from 'react';
import { signUp } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { InputField } from '@/components/ui/InputField';

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Navigate only after onAuthStateChanged has fired and set the cookie
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/character-creation');
    }
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
      // Navigation is handled by the useEffect above once auth state updates
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(friendlyAuthError(msg));
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl p-8 shadow-lg dark:shadow-black/40">
      <h2 className="font-display text-xl font-bold text-gray-900 dark:text-slate-100 mb-1">
        Begin your journey
      </h2>
      <p className="text-gray-400 dark:text-slate-500 text-sm mb-6">
        Create your account to start adventuring
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Email
          </label>
          <InputField
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="hero@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Password
          </label>
          <InputField
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Confirm Password
          </label>
          <InputField
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-red-600 dark:text-red-300 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none text-white font-bold py-2.5 rounded-lg transition-all active:scale-[0.98]"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-gray-400 dark:text-slate-500 text-sm mt-6">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function friendlyAuthError(msg: string): string {
  if (msg.includes('email-already-in-use')) return 'An account with this email already exists.';
  if (msg.includes('invalid-email')) return 'Please enter a valid email address.';
  if (msg.includes('weak-password')) return 'Password is too weak. Use at least 6 characters.';
  return 'Something went wrong. Please try again.';
}
