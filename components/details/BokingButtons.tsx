'use client';
import { ExternalLink, Heart, Share2 } from 'lucide-react';
import { data } from '../../data/packagesData';

interface Props {
  id: string;
}

export function BookingButtons({ id }: Props) {
  const d = data.find((d) => d.id === id)!;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="border-white-secondary w-full border bg-white p-5">
        <h3 className="mb-4 text-base font-bold text-black/80 2xl:text-lg">Best Time to Visit</h3>
        <div className="flex flex-wrap gap-2">
          {d.bestTimeToVisit.map((month) => (
            <span
              key={month}
              className="border-white-secondary rounded border px-4 py-1.5 text-sm text-black/80 2xl:text-base"
            >
              {month}
            </span>
          ))}
        </div>
      </div>

      <button className="bg-blue hover:bg-blue/90 flex w-full items-center justify-center gap-2 py-4 text-sm font-semibold text-white transition-colors 2xl:text-base">
        <ExternalLink size={16} strokeWidth={2} />
        Book this Combo
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button className="hover:border-blue hover:text-blue border-white-secondary flex items-center justify-center gap-2 border bg-white py-3 text-sm text-black/80 transition-colors 2xl:text-base">
          <Heart size={16} strokeWidth={1.8} />
          Save
        </button>
        <button className="hover:border-blue hover:text-blue border-white-secondary flex items-center justify-center gap-2 border bg-white py-3 text-sm text-black/80 transition-colors 2xl:text-base">
          <Share2 size={16} strokeWidth={1.8} />
          Share
        </button>
      </div>
    </div>
  );
}

export default BookingButtons;
