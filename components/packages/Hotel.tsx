import { LayoutGrid, Star } from 'lucide-react';
import { data } from '../../data/packagesData';

interface Props {
  id: string;
}

export function HotelCard({ id }: Props) {
  const d = data.find((d) => d.id === id)!;
  const { hotel } = d;

  return (
    <div className="border-white-secondary w-full rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between 2xl:mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-blue/10 flex h-9 w-9 items-center justify-center rounded-lg 2xl:h-11 2xl:w-11">
            <LayoutGrid size={18} strokeWidth={1.8} className="text-blue 2xl:hidden" />
            <LayoutGrid size={22} strokeWidth={1.8} className="text-blue hidden 2xl:block" />
          </div>
          <span className="text-base font-semibold text-black/80 2xl:text-lg">Hotel</span>
        </div>
        <span className="border-white-secondary flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-semibold text-black/80 2xl:text-base">
          <Star size={13} className="fill-yellow-400 text-yellow-400" />
          {hotel.rating}
        </span>
      </div>

      <h2 className="mb-2 text-2xl font-bold text-black/80 2xl:mb-5 2xl:text-3xl">{hotel.name}</h2>

      <div className="grid grid-cols-4 gap-4 bg-[#F8F9FA] px-4 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-gray text-[10px] font-semibold tracking-wider uppercase 2xl:text-xs">
            Category
          </span>
          <span className="text-sm font-semibold text-black/80 2xl:text-base">
            {hotel.category}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray text-[10px] font-semibold tracking-wider uppercase 2xl:text-xs">
            Per Night
          </span>
          <span className="text-sm font-semibold text-black/80 2xl:text-base">
            ₹{hotel.perNight.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray text-[10px] font-semibold tracking-wider uppercase 2xl:text-xs">
            Nights
          </span>
          <span className="text-sm font-semibold text-black/80 2xl:text-base">{hotel.nights}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray text-[10px] font-semibold tracking-wider uppercase 2xl:text-xs">
            Total
          </span>
          <span className="text-blue text-sm font-bold 2xl:text-base">
            ₹{hotel.total.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default HotelCard;
