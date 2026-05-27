import { Plane, Check } from 'lucide-react';
import { data } from '../../data/packagesData';

interface Props {
  id: string;
}

export function Flight({ id }: Props) {
  const d = data.find((d) => d.id === id)!;
  const { flight } = d;

  return (
    <div className="border-white-secondary border-roundness w-full border bg-white p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="bg-blue/10 flex h-9 w-9 items-center justify-center rounded-lg 2xl:h-11 2xl:w-11">
          <Plane size={18} strokeWidth={1.8} className="text-blue 2xl:hidden" />
          <Plane size={22} strokeWidth={1.8} className="text-blue hidden 2xl:block" />
        </div>
        <span className="text-base font-semibold text-black/70 2xl:text-lg">Flight</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-gray text-sm">Airline</span>
          <span className="text-sm font-semibold text-black/70">{flight.airline}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray text-sm">Per Person</span>
          <span className="text-sm font-semibold text-black/70">
            ₹{flight.perPerson.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray text-sm">Duration</span>
          <span className="text-sm font-semibold text-black/70">{flight.duration}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray text-sm">Direct</span>
          <span className="bg-blue/10 text-blue flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-semibold">
            <Check size={13} strokeWidth={2.5} />
            {flight.direct ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="border-white-secondary mt-1 flex items-center justify-between border-t pt-4">
          <span className="text-gray text-sm">Total</span>
          <span className="text-xl font-bold text-black/70 2xl:text-xl">
            ₹{flight.total.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Flight;
