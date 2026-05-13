import Image from 'next/image';

interface Props {
  src: string;
  avatars?: string[];
}

export function HeroImage({ src, avatars = [] }: Props) {
  return (
    <div className="relative w-full overflow-hidden md:h-[553px]">
      <Image fill src={src} alt="destination hero" className="object-cover" />

      <div className="absolute inset-0 bg-black/40" />

      <div className="absolute bottom-9 left-9 flex flex-col gap-3">
        <p className="text-xl leading-snug font-semibold text-white md:text-2xl">
          Your next great adventure is one click away.
        </p>

        <div className="flex items-center gap-2.5">
          <div className="flex">
            {avatars.slice(0, 4).map((avatar, i) => (
              <div
                key={i}
                className="relative -ml-2 h-8 w-8 overflow-hidden rounded-full border-2 border-(--color-blue) first:ml-0"
              >
                <Image fill src={avatar} alt={`traveler ${i + 1}`} className="object-cover" />
              </div>
            ))}
            {avatars.length === 0 &&
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="-ml-2 h-8 w-8 rounded-full border-2 border-white bg-white/20 first:ml-0"
                />
              ))}
          </div>
          <p className="text-sm text-white">
            Join 50,000+ travelers planning with Instantly Holiday
          </p>
        </div>
      </div>
    </div>
  );
}
