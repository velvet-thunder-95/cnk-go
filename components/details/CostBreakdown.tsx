'use client';
import React from 'react';
import { data } from '../../data/packagesData';

interface Props {
  id: string;
}

export function CostBreakdown({ id }: Props) {
  const d = data.find((d) => d.id === id)!;
  const { visa, flights, hotel } = d.costBreakdown;

  return (
    <div className="border-white-secondary w-full border bg-white px-5 py-4">
      <h2 className="mb-4 text-lg font-semibold text-black/80 2xl:text-xl">Cost Breakdown</h2>

      <div className="mb-4 flex h-2.5 w-full overflow-hidden">
        <div className="bg-gray-400" style={{ width: `${visa.percentage}%` }} />
        <div className="bg-blue" style={{ width: `${flights.percentage}%` }} />
        <div className="bg-blue-secondary" style={{ width: `${hotel.percentage}%` }} />
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <div className="text-gray flex items-center gap-1.5 text-sm 2xl:text-base">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
          <span>Visa</span>
          <span className="font-medium text-black/80">₹{visa.amount.toLocaleString('en-IN')}</span>
          <span>({visa.percentage}%)</span>
        </div>

        <div className="text-gray flex items-center gap-1.5 text-sm 2xl:text-base">
          <span className="bg-blue h-2.5 w-2.5 rounded-full" />
          <span>Flights</span>
          <span className="font-medium text-black/80">
            ₹{flights.amount.toLocaleString('en-IN')}
          </span>
          <span>({flights.percentage}%)</span>
        </div>

        <div className="text-gray flex items-center gap-1.5 text-sm 2xl:text-base">
          <span className="h-2.5 w-2.5 rounded-full bg-[#3B1FA8]" />
          <span>Hotel</span>
          <span className="font-medium text-black/80">₹{hotel.amount.toLocaleString('en-IN')}</span>
          <span>({hotel.percentage}%)</span>
        </div>
      </div>
    </div>
  );
}

export default CostBreakdown;
