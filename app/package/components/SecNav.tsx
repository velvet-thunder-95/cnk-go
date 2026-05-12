'use client';

import { useState } from 'react';

const tabs = ['Overview', 'Itinerary', 'Inclusions'];

export default function SecNav() {
  const [active, setActive] = useState(0);

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] gap-8 px-4 sm:px-6">
        {tabs.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActive(idx)}
            className={`py-4 text-sm font-medium transition-colors ${
              active === idx
                ? 'border-b-2 border-(--color-yellow) text-[#1a2e4a]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </nav>
  );
}
