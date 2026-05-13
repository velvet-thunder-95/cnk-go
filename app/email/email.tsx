import Image from 'next/image';
import PrimaryButton from '../components/hero/PrimaryButton';

interface Props {
  image: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  travelers: string;
  hotel: string;
  refNumber: string;
}

export function EmailConfirmation({
  image,
  destination,
  checkIn,
  checkOut,
  travelers,
  hotel,
  refNumber,
}: Props) {
  const rows = [
    { label: 'Destination', value: destination },
    { label: 'Check-in', value: checkIn },
    { label: 'Check-out', value: checkOut },
    { label: 'Travelers', value: travelers },
    { label: 'Hotel', value: hotel },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-200 px-4 py-8 font-sans">
      <div className="w-full max-w-[560px] overflow-hidden rounded-xl bg-(--background) shadow-md">
        <div className="h-1.5 bg-(--color-yellow)" />

        <div className="border-b border-gray-100 px-8 py-5 text-center">
          <p className="m-0 text-lg font-semibold text-(--color-blue)">Instantly Holiday</p>
        </div>

        <div className="relative h-44 w-full">
          <Image fill src={image} alt="image destination" className="object-cover px-6" />
        </div>

        <div className="px-8 py-8 text-center">
          <h1 className="mt-0 mb-6 text-xl font-bold text-(--color-blue)">Booking Confirmed 🎉</h1>

          <div className="mb-7 overflow-hidden rounded-lg border border-gray-200 text-left">
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={`flex gap-4 px-4 py-3.5 ${i < rows.length - 1 ? 'border-b border-gray-200' : 'border-b border-gray-200'}`}
              >
                <span className="w-28 min-w-28 text-sm text-gray-400">{row.label}</span>
                <span className="text-sm font-medium text-black">{row.value}</span>
              </div>
            ))}
            <div className="flex gap-4 px-4 py-3.5">
              <span className="w-28 min-w-28 text-sm text-gray-400">Ref Number</span>
              <span className="text-sm font-semibold text-(--color-blue)">{refNumber}</span>
            </div>
          </div>

          <PrimaryButton
            text="View full booking details "
            textColor="--color-blue"
            onclick="/ll"
            textSize="18"
            height="40"
            width="50%"
          />
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-8 py-6 text-center">
          <p className="mb-1.5 text-xs text-gray-400">
            You received this email because you booked a trip with Instantly Holiday.
          </p>
          <p className="mb-1.5 text-xs text-gray-400">
            Instantly Holiday Inc. · 123 Travel Lane, San Francisco, CA 94105
          </p>
          <a href="#" className="text-xs text-gray-400 underline">
            Unsubscribe
          </a>
        </div>
      </div>
    </div>
  );
}
