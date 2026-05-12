import { PlaneLanding } from 'lucide-react';

interface Props {
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  airline: string;
  duration: string;
  nextDay?: boolean;
}

export default function FlightDetails({
  from,
  to,
  departureTime,
  arrivalTime,
  airline,
  duration,
  nextDay,
}: Props) {
  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="mb-6 text-sm font-semibold text-(--color-blue)">Flight Details</p>

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-[60px]">
          <p className="text-2xl font-bold text-(--color-blue)">{from}</p>
          <p className="mt-1 text-xs text-gray-400">{departureTime}</p>
        </div>

        <div className="flex flex-1 items-center gap-3">
          <div className="h-px flex-1 border-t border-dashed border-gray-300" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs whitespace-nowrap text-gray-400">
              {airline} · {duration}
            </p>
            <PlaneLanding className="h-5 w-5 text-(--color-blue)" />
          </div>
          <div className="h-px flex-1 border-t border-dashed border-gray-300" />
        </div>

        <div className="min-w-[60px] text-right">
          <p className="text-2xl font-bold text-(--color-blue)">{to}</p>
          <p className="mt-1 text-xs text-gray-400">
            {arrivalTime} {nextDay && <span className="text-(--color-blue)">(+1)</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
