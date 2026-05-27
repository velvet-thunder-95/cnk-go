'use client';
import React from 'react';
import PrimaryButton from '@/components/ui/primaryButton';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const Navbar: React.FC = () => {
  const router = useRouter();
  return (
    <nav className="border-white-secondary w-full border-b bg-white px-4 py-3 lg:px-6">
      <div className="mx-auto flex items-center justify-between gap-4">
        {/* <span className="text-md font-extrabold tracking-tight text-black/80 md:text-xl">
          INSTANTLY HOLIDAY
        </span> */}

        <Link href="/">
          <Image
            width={130}
            height={100}
            alt="cnk-logo"
            src={'/cnk-logo.png'}
            className="md:mx-10"
          />
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-gray hidden text-sm whitespace-nowrap sm:block">
            Global Travel Logistics Database
          </span>

          <button
            onClick={() => router.push('/auth?tab=signin')}
            className="hover:border-blue border-roundness hover:text-blue border-white-secondary cursor-pointer border bg-white px-4 py-1.5 text-sm font-medium whitespace-nowrap text-black/80 transition-colors"
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
