'use client';
import { CalendarDays, MapPin } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TopDeals } from '../TopDeals/TopDeals';
import { TripPrices } from '../TripPrices/TripPrices';
import SecondryBar from '../hero/SecondryBar';

export default function Bar() {
  const [active, setActive] = useState<number>(1);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const tabs = [
    { id: 1, title: 'Quick Weekend Planner', icon: MapPin },
    { id: 2, title: 'Destination Price Finder', icon: CalendarDays },
  ];

  useEffect(() => {
    const idx = tabs.findIndex((t) => t.id === active);
    const el = tabRefs.current[idx];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active]);

  return (
    <section className="w-full bg-[#ede8df]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-10 xl:px-14">
        <div className="relative flex gap-6 md:gap-10">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-1.5 pb-3 text-sm whitespace-nowrap transition-colors duration-300 md:text-base ${
                tab.id === active ? 'font-medium text-(--color-blue)' : 'text-gray-400'
              }`}
            >
              <tab.icon size={16} className="shrink-0" />
              <span>{tab.title}</span>
            </button>
          ))}

          <div
            className="absolute bottom-0 h-0.5 bg-(--color-blue) transition-all duration-300 ease-in-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
        </div>

        <div className="w-full">
          <SecondryBar />
        </div>

        <div className="w-full">{active === 1 ? <TopDeals /> : <TripPrices />}</div>
      </div>
    </section>
  );
}
