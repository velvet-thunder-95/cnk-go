'use client';
import Image from 'next/image';
import { CheckCircle } from 'lucide-react';
import { data } from '../../data/packagesData';

interface Props {
  id: string;
}

export function DestinationHero({ id }: Props) {
  const destinationDetails = data.find((d) => d.id === id)!;
  return (
    <div className="border-roundness relative mx-auto mt-12 mb-[17px] flex h-100 overflow-hidden xl:max-w-[1600px] 2xl:h-120 2xl:max-w-[1830px]">
      <Image
        src={destinationDetails.image}
        alt={destinationDetails.name}
        fill
        className="border-roundness object-cover"
        priority
      />
      <div className="absolute inset-0 bg-black/30" />

      <div className="absolute top-4 right-5 flex items-center gap-1.5 rounded bg-white/50 px-3 py-3 text-sm font-medium text-white backdrop-blur-sm 2xl:text-base">
        <CheckCircle size={13} className="text-white 2xl:hidden" />
        <CheckCircle size={16} className="hidden text-white 2xl:block" />
        {destinationDetails.visaLabel}
      </div>

      <div className="absolute bottom-4 left-4">
        <h1 className="font-inter text-5xl font-bold text-white 2xl:text-7xl">
          {destinationDetails.name}
        </h1>
        <p className="text-md font-inter px-2 text-white/80 2xl:text-lg">
          {destinationDetails.country}
        </p>
      </div>
    </div>
  );
}

export default DestinationHero;
