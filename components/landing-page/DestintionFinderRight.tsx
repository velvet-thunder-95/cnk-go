'use client';
import React, { useEffect, useState } from 'react';
import { Calendar, CreditCard, Hotel, Plane, Sparkles, Star } from 'lucide-react';
import PrimaryButton from '../ui/primaryButton';

interface Week {
  date: string;
  price: number;
  tier: 'cheap' | 'moderate' | 'expensive';
  visa: number;
  flight: number;
  hotel: number;
  isCheapest?: boolean;
  isCurrentWeek?: boolean;
  isSelected?: boolean;
}

interface MonthGroup {
  month: string;
  weeks: Week[];
}

const data: MonthGroup[] = [
  {
    month: 'May 2026',
    weeks: [
      { date: 'May 22', price: 74583, tier: 'cheap', visa: 7000, flight: 29000, hotel: 38583 },
      { date: 'May 29', price: 77054, tier: 'moderate', visa: 7000, flight: 30000, hotel: 40054 },
    ],
  },
  {
    month: 'Jun 2026',
    weeks: [
      { date: 'Jun 5', price: 74206, tier: 'cheap', visa: 7000, flight: 28000, hotel: 39206 },
      { date: 'Jun 12', price: 71820, tier: 'cheap', visa: 7000, flight: 27000, hotel: 37820 },
      { date: 'Jun 19', price: 70544, tier: 'cheap', visa: 7000, flight: 26500, hotel: 37044 },
      { date: 'Jun 26', price: 78624, tier: 'moderate', visa: 7000, flight: 31000, hotel: 40624 },
    ],
  },
  {
    month: 'Jul 2026',
    weeks: [
      { date: 'Jul 3', price: 73715, tier: 'cheap', visa: 7000, flight: 27500, hotel: 39215 },
      {
        date: 'Jul 10',
        price: 65011,
        tier: 'cheap',
        visa: 7000,
        flight: 24000,
        hotel: 34011,
        isCheapest: true,
      },
      { date: 'Jul 17', price: 69792, tier: 'cheap', visa: 7000, flight: 26000, hotel: 36792 },
      { date: 'Jul 24', price: 71103, tier: 'cheap', visa: 7000, flight: 26500, hotel: 37603 },
      { date: 'Jul 31', price: 68068, tier: 'cheap', visa: 7000, flight: 25000, hotel: 36068 },
    ],
  },
  {
    month: 'Aug 2026',
    weeks: [
      { date: 'Aug 5', price: 74206, tier: 'cheap', visa: 7000, flight: 28000, hotel: 39206 },
      { date: 'Aug 12', price: 71820, tier: 'cheap', visa: 7000, flight: 27000, hotel: 37820 },
      { date: 'Aug 19', price: 70544, tier: 'cheap', visa: 7000, flight: 26500, hotel: 37044 },
      { date: 'Aug 26', price: 78624, tier: 'expensive', visa: 7000, flight: 31000, hotel: 40624 },
    ],
  },
];

function WeekCard({ week }: { week: Week }) {
  return (
    <div className="w-full rounded-2xl bg-white p-5 shadow-md md:max-w-100 md:min-w-100">
      <div className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-800">
        <Calendar size={16} />
        <span>Week of {week.date}, 2026</span>
      </div>

      {week.isCheapest && (
        <div className="mb-4 flex items-center gap-1 text-sm text-green-500">
          <Sparkles size={14} />
          <span>Cheapest window!</span>
        </div>
      )}

      <hr className="my-3 border-gray-100" />

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">Total Core Cost</span>
        <span className="text-blue text-lg font-bold">₹{week.price.toLocaleString('en-IN')}</span>
      </div>

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CreditCard size={15} />
            <span>Visa</span>
          </div>
          <span>₹{week.visa.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Plane size={15} />
            <span>Flight</span>
          </div>
          <span>₹{week.flight.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Hotel size={15} />
            <span>Hotel</span>
          </div>
          <span>₹{week.hotel.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <PrimaryButton label="Book This Window" className="py-3" />
    </div>
  );
}

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
  const [open, setOpen] = useState<boolean | null>(false);
  const [date, setDate] = useState<string>('');

  const handleClick = (i: Week) => {
    if (open && date === i.date) {
      setOpen(false);
    } else {
      setDate(i.date);
      setOpen(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.week-card-container')) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full px-4">
      <div className="mb-5 flex max-w-[1150px] flex-wrap items-center justify-between gap-4">
        <p className="text-gray text-sm">Next 6 months • Click a week for details</p>
        <div className="flex items-center gap-4">
          {['cheap', 'moderate', 'expensive'].map((tier) => (
            <span
              key={tier}
              className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-black/80 uppercase"
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
            <h3 className="mb-3 text-lg font-bold text-black/80">{group.month}</h3>
            <div className="bg-white-secondary week-card-container mb-3 h-px w-full" />
            <div className="flex flex-wrap gap-3">
              {group.weeks.map((i) => {
                const isActive = selected === i.date;
                return (
                  <div key={i.date}>
                    <button
                      key={i.date}
                      onClick={() => {
                        setSelected(i.date);
                        handleClick(i);
                      }}
                      className={`border-roundness relative z-10 flex min-w-[120px] cursor-pointer flex-col items-start gap-1 border px-4 py-3 text-left transition-all duration-200 ${
                        isActive
                          ? 'border-blue bg-blue/10 text-blue!'
                          : 'hover:border-blue/40 border-white-secondary bg-white'
                      }`}
                    >
                      {isActive && (
                        <span className="border-gray bg-blue absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full border">
                          <Star size={20} className="fill-blue p-0.5 text-white" />
                        </span>
                      )}
                      <span
                        className={`text-xs font-medium ${i.isCurrentWeek && !isActive ? 'text-blue underline' : 'text-gray'}`}
                      >
                        {i.date}
                      </span>
                      <span
                        className={`text-lg font-bold ${isActive ? `text-blue` : `${tierColor[i.tier]}`}`}
                      >
                        ₹{i.price.toLocaleString('en-IN')}
                      </span>
                    </button>
                    {open && isActive && (
                      <div className="absolute left-0 z-20 w-full px-4 md:left-auto">
                        <WeekCard key={i.date} week={i} />
                      </div>
                    )}
                  </div>
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
