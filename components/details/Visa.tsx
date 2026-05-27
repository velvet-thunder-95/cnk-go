import { CreditCard } from 'lucide-react';
import { data } from '../../data/packagesData';

interface Props {
  id: string;
}

export function Visa({ id }: Props) {
  const d = data.find((d) => d.id === id)!;
  const { visa } = d;

  return (
    <div className="border-white-secondary border-roundness w-full border bg-white p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="bg-blue/10 flex h-9 w-9 items-center justify-center rounded-lg 2xl:h-11 2xl:w-11">
          <CreditCard size={18} strokeWidth={1.8} className="text-blue 2xl:hidden" />
          <CreditCard size={22} strokeWidth={1.8} className="text-blue hidden 2xl:block" />
        </div>
        <span className="text-base font-semibold text-black/70 2xl:text-lg">Visa</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-gray text-sm 2xl:text-base">Type</span>
          <span className="text-sm font-semibold text-black/70">{visa.type}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray text-sm 2xl:text-base">Cost</span>
          <span className="text-sm font-semibold text-black/70 2xl:text-base">₹{visa.cost}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray text-sm 2xl:text-base">Processing</span>
          <span className="text-sm font-semibold text-black/70 2xl:text-base">
            {visa.processing}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray text-sm 2xl:text-base">Complexity</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full 2xl:h-3 2xl:w-3 ${i < visa.complexityDots ? 'bg-green' : 'bg-white-secondary'}`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-black/70 2xl:text-base">
              {visa.complexity}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Visa;
