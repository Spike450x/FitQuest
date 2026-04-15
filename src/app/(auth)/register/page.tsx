"use client";

import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Navigate only after onAuthStateChanged has fired and set the cookie
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/character-creation");
    }
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Navigation is handled by the useEffect above once auth state updates
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(friendlyAuthError(msg));
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Begin your journey</h2>
      <p className="text-gray-400 text-sm mb-6">Create your account to start adventuring</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="hero@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-center text-gray-400 text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function friendlyAuthError(msg: string): string {
  if (msg.includes("email-already-in-use")) return "An account with this email already exists.";
  if (msg.includes("invalid-email")) return "Please enter a valid email address.";
  if (msg.includes("weak-password")) return "Password is too weak. Use at least 6 characters.";
  return "Something went wrong. Please try again.";
}
