import { CheckCircle } from 'lucide-react';

interface Props {
  visaType: string;
  processingTime: string;
}

export default function VisaRequirements({ visaType, processingTime }: Props) {
  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="mb-4 text-lg font-bold text-(--color-blue)">Visa Requirements</p>

      <p className="text-base text-(--color-blue)">{visaType}</p>
      <p className="mt-1 text-sm text-gray-400">Processing time: {processingTime}</p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-(--color-green)/10 px-4 py-2">
        <CheckCircle className="h-4 w-4 text-(--color-green)" />
        <span className="text-sm font-medium text-(--color-green)">We handle this</span>
      </div>
    </div>
  );
}
