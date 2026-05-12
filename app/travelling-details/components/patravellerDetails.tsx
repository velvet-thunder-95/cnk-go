'use client';

import { useRef } from 'react';
import { ArrowRight } from 'lucide-react';

const countryCodes = [
  { flag: '🇺🇸', code: '+1' },
  { flag: '🇬🇧', code: '+44' },
  { flag: '🇮🇳', code: '+91' },
  { flag: '🇦🇺', code: '+61' },
  { flag: '🇦🇪', code: '+971' },
];

const inputClass =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-(--color-blue) placeholder:text-gray-300 outline-none focus:border-(--color-blue)';

export default function WhoIsTraveling() {
  const t1First = useRef<HTMLInputElement>(null);
  const t1Last = useRef<HTMLInputElement>(null);
  const t1Email = useRef<HTMLInputElement>(null);
  const t1Phone = useRef<HTMLInputElement>(null);
  const code = useRef<HTMLInputElement>(null);

  const t2First = useRef<HTMLInputElement>(null);
  const t2Last = useRef<HTMLInputElement>(null);
  function handleSubmit() {
    if (!code.current || !t1Phone.current) return;
    const finalContact = code.current.value + t1Phone.current.value;
    const data = {
      traveler1: {
        firstName: t1First.current?.value,
        lastName: t1Last.current?.value,
        email: t1Email.current?.value,
        phone: finalContact,
      },
      traveler2: {
        firstName: t2First.current?.value,
        lastName: t2Last.current?.value,
      },
    };
    console.log(data);
    // TODO:
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-(--color-blue)">Who is traveling?</h1>

      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-sm font-semibold text-(--color-blue)">Traveler 1 (Primary)</p>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">First Name</label>
            <input ref={t1First} className={inputClass} placeholder="Enter first name" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">Last Name</label>
            <input ref={t1Last} className={inputClass} placeholder="Enter last name" />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs text-gray-500">Email</label>
          <input
            ref={t1Email}
            className={inputClass}
            placeholder="email@example.com"
            type="email"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-gray-500">Phone Number</label>
          <div className="flex gap-2">
            <select
              onChange={(e) => {
                if (code.current == null) return;
                code.current.value = e.target.value;
              }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-(--color-blue) outline-none focus:border-(--color-blue)"
            >
              {countryCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input
              ref={t1Phone}
              className={`${inputClass} flex-1`}
              placeholder="(555) 000-0000"
              type="tel"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-semibold text-(--color-blue)">Traveler 2</p>
          <div className="text-xs font-medium text-(--color-yellow)">
            Same contact info as Traveler 1
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">First Name</label>
            <input ref={t2First} className={inputClass} placeholder="Enter first name" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">Last Name</label>
            <input ref={t2Last} className={inputClass} placeholder="Enter last name" />
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-(--color-yellow) py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Continue to Flight Preferences
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
