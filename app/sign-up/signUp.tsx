'use client';
import { Eye, EyeOff, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

function handleSignUp() {
  // TODO:
}
function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score === 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-orange-400' };
  if (score === 3) return { score: 3, label: 'Good', color: 'bg-yellow-400' };
  return { score: 4, label: 'Strong', color: 'bg-green-500' };
}

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const strength = getStrength(password);

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm text-(--color-black) placeholder:text-gray-400 outline-none focus:border-(--color-blue) transition-colors';

  return (
    <div className="flex justify-center bg-[#f3f3f3] px-4 pt-10">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <p className="text-sm font-semibold text-(--color-blue)">Instantly Holiday</p>

        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-(--color-blue)">Plan your first trip</h1>
          <p className="text-sm text-gray-400">Create a free account — no credit card needed.</p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </div>

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />

          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        i <= strength.score ? strength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${strength.color.replace('bg-', 'text-')}`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAgreed(!agreed)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                agreed ? 'border-(--color-blue) bg-(--color-blue)' : 'border-gray-300 bg-white'
              }`}
            >
              {agreed && <Check size={12} strokeWidth={3} className="text-white" />}
            </button>
            <p className="text-sm text-gray-500">
              I agree to the{' '}
              <a href="/terms" className="text-(--color-blue) underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-(--color-blue) underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        <button
          onClick={handleSignUp}
          className="w-full rounded-xl bg-(--color-yellow) py-3.5 text-base font-semibold text-(--color-blue) transition-opacity hover:opacity-90"
        >
          Sign up
        </button>
        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-sm text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-semibold text-(--color-blue) transition-colors hover:bg-gray-50">
          Continue with Google
        </button>

        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-(--color-yellow) transition-opacity hover:opacity-80"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
