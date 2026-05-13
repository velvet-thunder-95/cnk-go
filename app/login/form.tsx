'use client';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

function handleSignin() {
  // TODO:
}
function handleForget() {
  // TODO:
}

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="flex justify-center bg-[#f3f3f3] px-4 pt-10">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <p className="text-sm font-semibold text-(--color-blue)">Instantly Holiday</p>

        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-(--color-blue)">Welcome back</h1>
          <p className="text-sm text-gray-400">Sign in to access your saved trips and bookings</p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-(--color-black) transition-colors outline-none placeholder:text-gray-400 focus:border-(--color-blue)"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 pr-11 text-sm text-(--color-black) transition-colors outline-none placeholder:text-gray-400 focus:border-(--color-blue)"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleForget}
              className="text-sm text-(--color-yellow) transition-opacity hover:opacity-80"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <button
          onClick={handleSignin}
          className="w-full rounded-xl bg-(--color-yellow) py-3.5 text-base font-semibold text-(--color-blue) transition-opacity hover:opacity-90"
        >
          Sign in
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
          Don&apos;t have an account?{' '}
          <a
            href="/signup"
            className="font-medium text-(--color-yellow) transition-opacity hover:opacity-80"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
