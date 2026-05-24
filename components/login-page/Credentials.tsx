'use client';
import { check } from '@/helpers/CredentialsCheck';
import PrimaryButton from '@/ui/PrimaryButton';
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
    console.log('login', email, password);
  }

  function handleSignup() {
    if (!check(email, password)) return;
    console.log('signup', email, password);
  }
  return (
    <div className="flex w-full flex-col items-center justify-center bg-white px-8 md:w-1/2">
      <div className="w-full max-w-[400px]">
        <h1 className="mb-1 text-2xl font-bold text-[#171717]">Welcome back</h1>
        <p className="mb-6 text-sm text-[#6B7280]">Enter your details to access your dashboard.</p>

        <div className="mb-6 flex rounded border border-[#E5E7EB]">
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'signin' ? 'bg-gray-400/40 text-[#171717]' : 'text-[#6B7280] hover:text-[#171717]'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === 'signup' ? 'bg-gray-400/40 text-[#171717]' : 'text-[#6B7280] hover:text-[#171717]'}`}
          >
            Create Account
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#171717]">Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus:border-blue w-full rounded border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#171717] placeholder-[#6B7280] focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#171717]">Password</label>
              <a href="#" className="hover:text-blue text-xs text-[#6B7280] transition-colors">
                Forgot Password?
              </a>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus:border-blue w-full rounded border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#171717] placeholder-[#6B7280] focus:outline-none"
            />
          </div>

          <PrimaryButton
            onClick={() => {
              console.log('clicked');
              tab === 'signin' ? handleSignin() : handleSignup();
            }}
            label={tab === 'signin' ? 'Continue to Dashboard →' : 'Create Account →'}
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
}
