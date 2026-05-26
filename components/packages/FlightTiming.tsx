import { PlaneTakeoff, PlaneLanding } from 'lucide-react';
import { data } from '../../data/packagesData';

interface Props {
  id: string;
}

export function FlightTiming({ id }: Props) {
  const d = data.find((d) => d.id === id)!;

  const icons = [
    <PlaneTakeoff key={'takeoff'} size={18} strokeWidth={1.8} className="text-gray" />,
    <PlaneLanding key={'landing'} size={18} strokeWidth={1.8} className="text-gray" />,
  ];

  return (
    <div className="border-white-secondary w-full border bg-white p-5">
      <h3 className="mb-4 text-base font-bold text-black/80 2xl:text-lg">Best Flight Timings</h3>

      <div className="flex flex-col gap-3">
        {d.bestFlightTimings.map((timing, i) => (
          <div
            key={timing.label}
            className="border-white-secondary flex items-center justify-between border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {icons[i]}
              <span className="text-sm text-black/80 2xl:text-base">{timing.label}</span>
            </div>
            <span className="bg-gray/5 border-white-secondary rounded px-3 py-1 text-sm text-black/80 2xl:text-base">
              {timing.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FlightTiming;
