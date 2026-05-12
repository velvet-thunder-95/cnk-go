'use client';
import { type TripPrice } from '@/app/interfaces/TripPrices';
import { useState } from 'react';

const months: TripPrice[] = [
  {
    month: 'August',
    weeks: [
      { week: 1, price: 1240 },
      { week: 2, price: 1140 },
      { week: 3, price: 1310 },
      { week: 4, price: 1240 },
    ],
  },
  {
    month: 'September',
    weeks: [
      { week: 1, price: 1200 },
      { week: 2, price: 1190 },
      { week: 3, price: 1240 },
      { week: 4, price: 1260 },
    ],
  },
  {
    month: 'October',
    weeks: [
      { week: 1, price: 1080 },
      { week: 2, price: 1220 },
      { week: 3, price: 1250 },
      { week: 4, price: 1300 },
    ],
  },
];

export function TripPrices() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex justify-center p-4 sm:p-8">
      <div className="mt-5 w-full max-w-[1600px]">
        <p className="mb-4 px-1 text-gray-500 md:text-xl">
          Not sure when to travel? We&apos;ve done the research.
        </p>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-[#1a2e4a] md:text-3xl">When to go?</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-green)' }}
                />
                <span className="text-sm whitespace-nowrap text-gray-500">Good value</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-yellow)' }}
                />
                <span className="text-s m whitespace-nowrap text-gray-500">Average</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-blue)' }}
                />
                <span className="text-sm whitespace-nowrap text-gray-500">Cheapest</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {months.map((i) => (
              <div key={i.month} className="grid grid-cols-1 items-center gap-2 md:grid-cols-8">
                <span className="pr-2 text-center text-sm font-semibold tracking-wide text-gray-400 uppercase md:col-span-1 md:text-base">
                  {i.month}
                </span>
                <div className="grid grid-cols-2 gap-2 md:col-span-7 md:grid-cols-4">
                  {i.weeks.map((j) => {
                    const key = `${i.month}-${j.week}`;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelected(selected === key ? null : key)}
                        className={`flex w-full flex-col items-center justify-center rounded-xl border-1 px-3 py-4 transition-all duration-150 sm:py-5 ${
                          selected === key
                            ? 'border-2 border-(--color-blue)'
                            : 'border-gray-200 hover:border-(--color-blue)'
                        }`}
                      >
                        <span className="mb-1 text-xs font-medium text-gray-400 md:text-base">
                          Week {j.week}
                        </span>
                        <span className="text-sm font-bold text-(--color-blue) md:text-base">
                          ${j.price.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
