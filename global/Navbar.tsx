'use client';
import React from 'react';
import PrimaryButton from '@/ui/PrimaryButton';

const Navbar: React.FC = () => {
  return (
    <nav className="w-full border-b border-[#E5E7EB] bg-white px-6 py-3">
      <div className="mx-auto flex items-center justify-between gap-4">
        <span className="text-xl font-extrabold tracking-tight text-[#171717]">
          INSTANTLY HOLIDAY
        </span>

        <div className="flex items-center gap-8">
          <span className="hidden text-sm whitespace-nowrap text-[#6B7280] sm:block">
            Global Travel Logistics Database
          </span>

          <button className="hover:border-blue hover:text-blue rounded border border-[#E5E7EB] bg-white px-4 py-1.5 text-sm font-medium whitespace-nowrap text-[#171717] transition-colors">
            Sign In
          </button>

          <PrimaryButton label="Sign Up" className="w-auto px-4 py-1.5 text-sm whitespace-nowrap" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
