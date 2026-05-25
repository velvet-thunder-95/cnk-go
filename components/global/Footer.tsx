'use client';
import React from 'react';

const links = ['DATA PRIVACY', 'SYSTEM PROTOCOL', 'SUPPORT VECTOR'];

const Footer: React.FC = () => {
  return (
    <footer className="border-white-secondary w-full border-t bg-white px-6 py-6">
      <div className="mx-auto flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-base font-extrabold tracking-tight text-black/80">
            INSTANTLY HOLIDAY
          </span>
          <span className="text-gray text-xs">© 2024 INSTANTLY HOLIDAY. LOGISTICS DATABASE.</span>
        </div>

        <div className="grid grid-cols-2 items-center gap-8 md:grid-cols-3">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="hover:text-blue text-xs font-semibold tracking-wider text-black/80 transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
