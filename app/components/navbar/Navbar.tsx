'use client';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import LoginButton from './LoginButton';
import SignupButton from './SignupButton';
import Link from 'next/link';

const navLinks = [
  {
    name: 'Destination',
    route: '/destinations',
  },
  {
    name: 'Packages',
    route: '/all-packages',
  },
  {
    name: 'Deal',
    route: '/deals',
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="h-[64px] bg-white shadow-sm">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-4">
          <Link href={'/'} className="text-2xl font-semibold text-(--color-blue)">
            Instantly Holiday
          </Link>

          <div className="hidden items-center gap-10 md:flex">
            {navLinks.map((i) => (
              <Link
                key={i.name}
                href={i.route}
                className="text-sm text-gray-600 hover:text-(--color-blue) md:text-lg"
              >
                {i.name}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <LoginButton />
            <SignupButton />
          </div>

          <button className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <div className="transition-all duration-150">
        {open && (
          <div
            className="fixed inset-0 z-40 backdrop-blur-md md:hidden"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-y-0 right-0 w-64 bg-white shadow-xl">
              <div className="flex h-[64px] items-center justify-between border-b border-white/20 px-4">
                <span className="text-xl font-semibold text-(--color-blue)">Instantly Holiday</span>
                <button onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col p-4">
                {navLinks.map((i) => (
                  <button
                    key={i.route}
                    className="px-2 py-3 text-left text-xl text-gray-700 hover:text-(--color-blue)"
                    onClick={() => setOpen(false)}
                  >
                    {i.name}
                  </button>
                ))}
              </div>

              <div className="flex h-[680px] flex-col justify-end gap-3 border-t p-4">
                <LoginButton />
                <SignupButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
