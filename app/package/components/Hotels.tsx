import Image from 'next/image';
import { Star } from 'lucide-react';

interface HotelAccommodationProps {
  name: string;
  image: string;
  stars: number;
  roomType: string;
  bedType: string;
}

export default function HotelAccommodation({
  name,
  image,
  stars,
  roomType,
  bedType,
}: HotelAccommodationProps) {
  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="mb-5 text-lg font-bold text-(--color-blue)">Hotel Accommodation</p>

      <div className="flex items-center gap-4">
        <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl">
          <Image src={image} alt={name} fill className="object-cover" />
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-semibold text-(--color-blue)">{name}</p>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4"
                fill={i < stars ? 'var(--color-yellow)' : 'none'}
                stroke={i < stars ? 'var(--color-yellow)' : '#d1d5db'}
              />
            ))}
          </div>
          <p className="text-sm text-gray-400">
            {roomType} · {bedType}
          </p>
        </div>
      </div>
    </div>
  );
}
