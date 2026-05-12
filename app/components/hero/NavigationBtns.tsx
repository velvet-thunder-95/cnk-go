'use client';

import { type NavButton } from '@/app/interfaces/NavButtons';
import { useState } from 'react';

const btndata: NavButton[] = [
  {
    title: 'Bali',
    to: '/Bali',
  },
  {
    title: 'Maldives',
    to: '/Maldives',
  },
  {
    title: 'Santorini',
    to: '/Santorini',
  },
  {
    title: 'Phuket',
    to: '/Phuket',
  },
  {
    title: 'Dubai',
    to: '/Dubai',
  },
  {
    title: 'Tokyo',
    to: '/Tokyo',
  },
];

export default function NavigationBtn() {
  const [isActive, setIsActive] = useState<number>(0);
  return (
    <div className="scrollbar-none overflow-x-auto [&::-webkit-scrollbar]:hidden">
      <div className="flex max-w-[400px] gap-4 rounded-full md:max-w-full md:gap-6">
        {btndata.map((i, idx) => {
          return (
            <div
              key={idx}
              className={`rounded-full border px-4 py-2 transition-all md:px-6 md:text-lg ${idx == isActive ? `border-white bg-white/80 text-(--color-blue)` : ``}`}
              onClick={() => {
                setIsActive(idx);
              }}
            >
              {i.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}
