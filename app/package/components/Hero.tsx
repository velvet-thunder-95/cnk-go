import { Star } from 'lucide-react';
import Image from 'next/image';

export default function Hero() {
  const content = [
    {
      stars: '4.9',
      primary: 'Bali, Indonesia',
      secondary: `Experience the ultimate tropical getaway with pristine beaches, lush rice terraces, and vibrant culture. This package includes everything you need for a perfect vacation.`,
    },
  ];
  return (
    <div className="relative min-h-[544px] w-full text-white">
      <Image
        src="https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        alt="Bali Image"
        fill
        className="bg-white/20 object-center"
      />
      <div className="absolute bottom-0 left-0 mt-16 flex flex-col items-center gap-10 md:mt-32 md:gap-36">
        {content.map((i) => {
          return (
            <div key={i.primary} className="flex flex-col gap-2 pb-4 pl-4 md:gap-3 md:px-8 md:pb-8">
              <div className="y-1 flex w-fit items-center gap-1 rounded-full bg-(--color-yellow) px-2">
                <Star size={20} />
                {i.stars}
              </div>
              <div className="text-2xl font-semibold md:text-4xl">{i.primary}</div>
              <div className="text-md max-w-[900px] md:text-lg">{i.secondary}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
