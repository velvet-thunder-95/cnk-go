'use client';
import React from 'react';
import PrimaryButton from '@/components/ui/primaryButton';
import { useRouter } from 'next/navigation';

const Navbar: React.FC = () => {
  const router = useRouter();
  return (
    <nav className="border-white-secondary w-full border-b bg-white px-4 py-3 lg:px-6">
      <div className="mx-auto flex items-center justify-between gap-4">
        <span className="text-md font-extrabold tracking-tight text-black/80 md:text-xl">
          INSTANTLY HOLIDAY
        </span>

        <div className="flex items-center gap-3">
          <span className="text-gray hidden text-sm whitespace-nowrap sm:block">
            Global Travel Logistics Database
          </span>

          <button
            onClick={() => router.push('/auth?tab=signin')}
            className="hover:border-blue hover:text-blue border-white-secondary border bg-white px-4 py-1.5 text-sm font-medium whitespace-nowrap text-black/80 transition-colors"
          >
            Sign In
          </button>

          <PrimaryButton
            onClick={() => router.push('/auth?tab=signup')}
            label="Sign Up"
            className="w-auto px-4 py-2 text-sm whitespace-nowrap"
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
