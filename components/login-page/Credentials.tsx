'use client';
import { check } from '@/helpers/credentialsCheck';
import PrimaryButton from '@/components/ui/primaryButton';
import { useState } from 'react';

interface Props {
  defaultTab: 'signin' | 'signup';
}
export default function Credentials({ defaultTab }: Props) {
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSignin() {
    if (!check(email, password)) return;
  }

  function handleSignup() {
    if (!check(email, password)) return;
  }
  return (
    <div className="flex w-full flex-col items-center justify-center bg-white px-8 md:w-1/2">
      <div className="w-full max-w-[400px]">
        <div className="bg-blue mb-1 h-1 w-3"></div>
        <h1 className="mb-1 text-2xl font-bold text-black/80">Welcome back</h1>
        <p className="text-gray mb-6 text-sm">Enter your details to access your dashboard.</p>

        <div className="border-white-secondary border-roundness mb-6 flex border bg-black/5 p-[5px]">
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'signin' ? 'bg-white text-black/80' : 'text-gray'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'signup' ? 'bg-white text-black/80' : 'text-gray bg-white/40'}`}
          >
            Create Account
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-black/80">Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus:border-blue border-roundness placeholder-gray border-white-secondary w-full rounded border px-3 py-2.5 text-sm text-black/80 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-black/80">Password</label>
              <a href="#" className="hover:text-blue text-gray text-xs transition-colors">
                Forgot Password?
              </a>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus:border-blue border-roundness placeholder-gray border-white-secondary w-full rounded border px-3 py-2.5 text-sm text-black/80 focus:outline-none"
            />
          </div>

          <PrimaryButton
            onClick={() => {
              tab === 'signin' ? handleSignin() : handleSignup();
            }}
            label={tab === 'signin' ? 'Continue to Dashboard →' : 'Create Account →'}
            className="mt-2 py-3"
          />
        </div>
      </div>
    </div>
  );
}
