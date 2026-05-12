'use client';

import { useState } from 'react';
import { Check, SlidersHorizontal, X } from 'lucide-react';

const regions = ['Asia', 'Europe', 'Middle East', 'Americas', 'Africa'];
const durations = ['Weekend (2-3 nights)', '1 Week (5-7 nights)', '2 Weeks (10-14 nights)'];
const hotelRatings = ['5 Stars', '4 Stars & Up', '3 Stars & Up'];

const min = 500;
const max = 3000;

export default function FilterSidebar() {
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState(3000);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['Asia']);
  const [selectedDuration, setSelectedDuration] = useState('1 Week (5-7 nights)');
  const [selectedRating, setSelectedRating] = useState('5 Stars');

  function toggleRegion(region: string) {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((i) => i !== region) : [...prev, region],
    );
  }

  function handleReset() {
    setBudget(3000);
    setSelectedRegions(['Asia']);
    setSelectedDuration('1 Week (5-7 nights)');
    setSelectedRating('5 Stars');
  }

  const content = (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-(--color-blue)">Filters</h2>
        <button onClick={handleReset} className="text-sm font-medium text-(--color-yellow)">
          Reset all
        </button>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-(--color-blue)">Budget (per person)</p>
        <input
          type="range"
          min={min}
          max={max}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full accent-(--color-yellow)"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>${min}</span>
          <span>${max}+</span>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-(--color-blue)">Region</p>
        <div className="flex flex-col gap-2.5">
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => toggleRegion(region)}
              className="flex items-center gap-3"
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${selectedRegions.includes(region) ? 'border-(--color-yellow) bg-(--color-yellow)' : 'border-gray-300'}`}
              >
                {selectedRegions.includes(region) && (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                )}
              </span>
              <span className="text-sm text-gray-600">{region}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-(--color-blue)">Trip Duration</p>
        <div className="flex flex-col gap-2.5">
          {durations.map((i) => (
            <button
              key={i}
              onClick={() => setSelectedDuration(i)}
              className="flex items-center gap-3"
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${selectedDuration === i ? 'border-(--color-yellow) bg-(--color-yellow)' : 'border-gray-300'}`}
              >
                {selectedDuration === i && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
              <span className="text-sm text-gray-600">{i}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-(--color-blue)">Hotel Rating</p>
        <div className="flex flex-col gap-2.5">
          {hotelRatings.map((i) => (
            <button
              key={i}
              onClick={() => setSelectedRating(i)}
              className="flex items-center gap-3"
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${selectedRating === i ? 'border-(--color-yellow) bg-(--color-yellow)' : 'border-gray-300'}`}
              >
                {selectedRating === i && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
              <span className="text-sm text-gray-600">{i}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-(--color-blue) shadow-sm md:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>

      {open && (
        <div className="absolute inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-bold text-(--color-blue)">Filters</span>
              <button onClick={() => setOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            {content}
            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-xl bg-(--color-yellow) py-3 text-sm font-semibold text-white"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 hidden pl-4 md:block">{content}</div>
    </>
  );
}
