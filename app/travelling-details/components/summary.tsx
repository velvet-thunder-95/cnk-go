import Image from 'next/image';
import { Calendar, Users, Building2 } from 'lucide-react';

interface PriceRow {
  label: string;
  amount: number;
  isDiscount?: boolean;
}

interface OrderSummaryProps {
  image: string;
  date: string;
  nights: number;
  travellers: number;
  hotel: string;
  priceRows: PriceRow[];
  totalPrice: number;
}

export default function OrderSummary({
  image,
  date,
  nights,
  travellers,
  hotel,
  priceRows,
  totalPrice,
}: OrderSummaryProps) {
  return (
    <div className="flex w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:mt-10 md:max-w-[500px]">
      <div className="w-1.5 flex-shrink-0 bg-(--color-yellow)" />

      <div className="flex flex-1 flex-col">
        <div className="p-4">
          <div className="relative h-50 w-full overflow-hidden rounded-xl">
            {image && <Image src={image} alt={hotel} fill className="" />}
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-2 border-b border-gray-100 pb-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span className="text-sm text-gray-600">
                {date} ({nights} Nights)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span className="text-sm text-gray-600">{travellers} Adults</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span className="text-sm text-gray-600">{hotel}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 border-b border-gray-200 py-4">
            {priceRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span
                  className={`text-sm ${row.isDiscount ? 'text-(--color-green)' : 'text-gray-500'}`}
                >
                  {row.label}
                </span>
                <span
                  className={`text-sm font-medium ${row.isDiscount ? 'text-(--color-green)' : 'text-gray-700'}`}
                >
                  {row.isDiscount
                    ? `-$${Math.abs(row.amount).toLocaleString()}`
                    : `$${row.amount.toLocaleString()}`}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4">
            <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
              Total Price
            </span>
            <span className="text-3xl font-bold text-(--color-blue)">
              ${totalPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
