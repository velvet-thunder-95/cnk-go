'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import PrimaryButton from '@/app/components/hero/PrimaryButton';

interface Props {
  originalPrice: number;
  discountedPrice: number;
  date: string;
}

export default function BookingCard({ originalPrice, discountedPrice, date }: Props) {
  const [travellers, setTravellers] = useState(2);
  const [editingDate, setEditingDate] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [displayDate, setDisplayDate] = useState(date);
  const savings = originalPrice - discountedPrice;

  function handleSaveDate() {
    if (checkIn && checkOut) {
      const format = (d: string) =>
        new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      setDisplayDate(`${format(checkIn)} – ${format(checkOut)}`);
    }
    setEditingDate(false);
  }

  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 line-through">${originalPrice.toLocaleString()}</p>
          <p className="text-3xl font-bold text-(--color-blue)">
            ${discountedPrice.toLocaleString()}
            <span className="ml-1 text-base font-normal text-gray-400">/person</span>
          </p>
        </div>
        <span className="rounded-full bg-(--color-green)/10 px-3 py-1 text-xs font-semibold text-(--color-green)">
          Save ${savings.toLocaleString()}
        </span>
      </div>

      <div className="mb-3 rounded-xl border border-gray-200 px-4 py-3">
        {editingDate ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs tracking-wide text-gray-400 uppercase">Check In</p>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-(--color-blue) outline-none focus:border-(--color-blue)"
                />
              </div>
              <div>
                <p className="mb-1 text-xs tracking-wide text-gray-400 uppercase">Check Out</p>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-(--color-blue) outline-none focus:border-(--color-blue)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingDate(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDate}
                className="text-xs font-semibold text-(--color-yellow)"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs tracking-wide text-gray-400 uppercase">Dates</p>
              <p className="mt-0.5 text-sm font-medium text-(--color-blue)">{displayDate}</p>
            </div>
            <button
              onClick={() => setEditingDate(true)}
              className="text-sm font-semibold text-(--color-yellow)"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      <div className="mb-5 rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-wide text-gray-400 uppercase">Travellers</p>
            <p className="mt-0.5 text-sm font-medium text-(--color-blue)">
              {travellers} {travellers === 1 ? 'Adult' : 'Adults'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTravellers((p) => Math.max(1, p - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-(--color-blue) hover:text-(--color-blue)"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTravellers((p) => p + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-(--color-blue) hover:text-(--color-blue)"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <PrimaryButton
        onclick={'/book'}
        text="Book Now"
        height="52"
        width="100%"
        textColor="#ffffff"
        textSize="17"
      />
      <p className="mt-2 text-center text-xs text-gray-400">You won&apos;t be charged yet</p>
    </div>
  );
}
