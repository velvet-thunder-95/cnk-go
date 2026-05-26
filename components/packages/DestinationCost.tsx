'use client';
import { Users, Calendar } from 'lucide-react';
import { data } from '../../data/packagesData';

interface Props {
  id: string;
}

export function DestinationCost({ id }: Props) {
  const destinationDetails = data.find((d) => d.id === id)!;
  return (
    <div className="border-white-secondary w-full border bg-white px-5 py-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray text-[11px] font-semibold tracking-widest uppercase 2xl:text-xs">
            TOTAL CORE COST
          </p>
          <p className="text-blue text-[42px] leading-tight font-bold 2xl:text-5xl">
            ₹{destinationDetails.totalCost.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white-secondary/30 flex flex-col gap-2 rounded-lg px-5 py-3">
          <div className="flex items-center gap-2 text-sm 2xl:text-base">
            <Users size={18} strokeWidth={1.8} className="text-blue" />
            <span className="text-black/70">{destinationDetails.travelers} travelers</span>
          </div>
          <div className="flex items-center gap-2 text-sm 2xl:text-base">
            <Calendar size={18} strokeWidth={1.8} className="text-blue" />
            <span className="text-black/70">{destinationDetails.nights} nights</span>
          </div>
        </div>
      </div>

      <p className="text-gray mt-5 text-sm 2xl:text-base">{destinationDetails.tagline}</p>
    </div>
  );
}

export default DestinationCost;
