'use client';

import { useEffect, useState } from 'react';
import { signIn } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { InputField } from '@/components/ui/InputField';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Navigate only after onAuthStateChanged has fired and set the cookie
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation is handled by the useEffect above once auth state updates
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(friendlyAuthError(msg));
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl p-8 shadow-lg dark:shadow-black/40">
      <h2 className="font-display text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">
        Welcome back, adventurer
      </h2>

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
            autoComplete="current-password"
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
          {loading ? 'Entering the realm...' : 'Enter the Realm'}
        </button>
      </form>

      <p className="text-center text-gray-400 dark:text-slate-500 text-sm mt-6">
        New adventurer?{' '}
        <Link
          href="/register"
          className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 font-medium transition-colors"
        >
          Create a character
        </Link>
      </p>
    </div>
  );
}

function friendlyAuthError(msg: string): string {
  if (
    msg.includes('user-not-found') ||
    msg.includes('wrong-password') ||
    msg.includes('invalid-credential')
  )
    return 'Invalid email or password.';
  if (msg.includes('too-many-requests')) return 'Too many attempts. Try again later.';
  return 'Something went wrong. Please try again.';
}
