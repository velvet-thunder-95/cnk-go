'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { data } from '../../data/packagesData';

interface Props {
  id: string;
}

export function FeaturedHotel({ id }: Props) {
  const d = data.find((d) => d.id === id)!;
  const { hotel } = d;
  const [activeImg, setActiveImg] = useState(hotel.images[0]);

  return (
    <div className="border-white-secondary w-full border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-black/80 2xl:text-lg">Featured Hotel</h3>
        <span className="flex items-center gap-1 text-sm font-semibold text-black/80 2xl:text-base">
          <Star size={14} className="fill-yellow-400 text-yellow-400" />
          {hotel.rating}
        </span>
      </div>

      <div className="relative mb-3 h-[180px] w-full overflow-hidden 2xl:h-[220px]">
        <Image
          src={activeImg}
          alt={hotel.name}
          fill
          className="object-cover transition-all duration-300"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-3 left-3">
          <p className="text-base font-bold text-white 2xl:text-lg">{hotel.name}</p>
          <p className="text-[10px] font-semibold tracking-widest text-white/80 uppercase 2xl:text-xs">
            {hotel.stars} STAR
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {hotel.images.map((img, i) => (
          <button
            key={i}
            onClick={() => setActiveImg(img)}
            className={`relative h-[70px] overflow-hidden transition-all duration-150 2xl:h-[90px] ${activeImg === img ? 'ring-blue ring-2' : 'opacity-70 hover:opacity-100'}`}
          >
            <Image src={img} alt={`${hotel.name} ${i + 1}`} fill className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default FeaturedHotel;
