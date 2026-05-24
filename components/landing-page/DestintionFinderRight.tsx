'use client';
import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface WeekEntry {
  date: string;
  price: number;
  tier: 'cheap' | 'moderate' | 'expensive';
  isCurrentWeek?: boolean;
  isSelected?: boolean;
}

interface MonthGroup {
  month: string;
  weeks: WeekEntry[];
}

const data: MonthGroup[] = [
  {
    month: 'May 2026',
    weeks: [
      { date: 'May 22', price: 74583, tier: 'cheap' },
      { date: 'May 29', price: 77054, tier: 'moderate' },
    ],
  },
  {
    month: 'Jun 2026',
    weeks: [
      { date: 'Jun 5', price: 74206, tier: 'cheap' },
      { date: 'Jun 12', price: 71820, tier: 'cheap' },
      { date: 'Jun 19', price: 70544, tier: 'cheap' },
      { date: 'Jun 26', price: 78624, tier: 'moderate' },
    ],
  },
  {
    month: 'Jul 2026',
    weeks: [
      { date: 'Jul 3', price: 73715, tier: 'cheap' },
      { date: 'Jul 10', price: 65011, tier: 'cheap' },
      { date: 'Jul 17', price: 69792, tier: 'cheap' },
      { date: 'Jul 24', price: 71103, tier: 'cheap' },
      { date: 'Jul 31', price: 68068, tier: 'cheap' },
    ],
  },
  {
    month: 'Aug 2026',
    weeks: [
      { date: 'Aug 5', price: 74206, tier: 'cheap' },
      { date: 'Aug 12', price: 71820, tier: 'cheap' },
      { date: 'Aug 19', price: 70544, tier: 'cheap' },
      { date: 'Aug 26', price: 78624, tier: 'expensive' },
    ],
  },
];

const tierColor: Record<string, string> = {
  cheap: 'text-(--color-green-secondary)',
  moderate: 'text-yellow-500',
  expensive: 'text-red-500',
};

const legendDot: Record<string, string> = {
  cheap: 'bg-(--color-green-secondary)',
  moderate: 'bg-yellow-500',
  expensive: 'bg-red-500',
};

const DestinationFinderRight: React.FC = () => {
  const [selected, setSelected] = useState<string>('May 22');
  return (
    <div className="w-full bg-white px-4">
      <div className="mb-5 flex max-w-[1150px] flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#6B7280]">Next 6 months • Click a week for details</p>
        <div className="flex items-center gap-4">
          {['cheap', 'moderate', 'expensive'].map((tier) => (
            <span
              key={tier}
              className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[#171717] uppercase"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${legendDot[tier]}`} />
              {tier}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {data.map((group) => (
          <div key={group.month}>
            <h3 className="mb-3 text-lg font-bold text-[#171717]">{group.month}</h3>
            <div className="mb-3 h-px w-full bg-[#E5E7EB]" />
            <div className="flex flex-wrap gap-3">
              {group.weeks.map((i) => {
                const isActive = selected === i.date;
                return (
                  <button
                    key={i.date}
                    onClick={() => {
                      setSelected(i.date);
                    }}
                    className={`relative flex min-w-[120px] cursor-pointer flex-col items-start gap-1 rounded border px-4 py-3 text-left transition-all duration-200 ${
                      isActive
                        ? 'border-(--color-blue) bg-(--color-blue)/10'
                        : 'hover:border-blue/40 border-[#E5E7EB] bg-white'
                    }`}
                  >
                    {isActive && (
                      <span className="bg-blue absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full">
                        <Star size={35} className="fill-(--color-blue) text-white" />
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium ${i.isCurrentWeek && !isActive ? 'text-blue underline' : 'text-[#6B7280]'}`}
                    >
                      {i.date}
                    </span>
                    <span className={`text-lg font-bold ${tierColor[i.tier]}`}>
                      ₹{i.price.toLocaleString('en-IN')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DestinationFinderRight;
