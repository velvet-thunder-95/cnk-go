'use client';
import React from 'react';

const links = ['DATA PRIVACY', 'SYSTEM PROTOCOL', 'SUPPORT VECTOR'];

const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[#E5E7EB] bg-white px-6 py-6">
      <div className="mx-auto flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-base font-extrabold tracking-tight text-[#171717]">
            INSTANTLY HOLIDAY
          </span>
          <span className="text-xs text-[#6B7280]">
            © 2024 INSTANTLY HOLIDAY. LOGISTICS DATABASE.
          </span>
        </div>

        <div className="flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="hover:text-blue text-xs font-semibold tracking-wider text-[#171717] transition-colors"
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
