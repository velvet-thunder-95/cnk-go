'use client';
import { useState, useEffect } from 'react';
import supabaseBrowserClient from '../../../../config/supabaseBrowserClient.js';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Set up listener FIRST, then trigger session
    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    supabaseBrowserClient.auth.getSession();

    return () => subscription.unsubscribe();
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    // Supabase uses the session set by PASSWORD_RECOVERY event
    // No need to manually pass the token — it's already in the session
    const { error } = await supabaseBrowserClient.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
  };

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-96 rounded-xl border border-gray-100 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">Verifying reset link...</p>
          <p className="mt-2 text-xs text-gray-400">
            Link expired?{' '}
            <a href="/auth/forgot-password" className="text-gray-800 underline">
              Request a new one
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-96 rounded-xl border border-gray-100 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="#3B6D11"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Password updated</h2>
          <p className="text-sm text-gray-500">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-96 rounded-xl border border-gray-100 bg-white p-8">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="white"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M22 16.5a4 4 0 01-4 4H6a4 4 0 01-4-4V8l10-4 10 4v8.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm font-medium tracking-wide text-gray-900">CNK GO</span>
        </div>

        <h1 className="mb-1 text-2xl font-semibold text-gray-900">New password</h1>
        <p className="mb-6 text-sm text-gray-500">Must be at least 8 characters.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-gray-500 uppercase">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 transition-all outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-gray-500 uppercase">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 transition-all outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />
            {confirmPassword && (
              <p
                className={`mt-1.5 text-xs ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}
              >
                {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || newPassword !== confirmPassword || newPassword.length < 8}
            className="mt-2 h-11 w-full rounded-lg bg-gray-900 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Updating...' : 'Reset password'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-gray-400">
          <a href="/auth/login" className="border-b border-gray-300 font-medium text-gray-700">
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
