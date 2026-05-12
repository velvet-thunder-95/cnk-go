import { Search } from 'lucide-react';
import PrimaryButton from './PrimaryButton';

interface HeroField {
  label: string;
  value: string;
}

const heroFields: HeroField[] = [
  { label: 'From', value: 'New York (JFK)' },
  { label: 'Date', value: 'Aug 12 – Aug 19' },
  { label: 'Nights', value: '7 Nights' },
  { label: 'Travellers', value: '2 Adults' },
  { label: 'Hotel', value: '4–5 Stars' },
];

export default function SecondryBar() {
  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-md">
      <div className="flex flex-col md:h-[74px] md:flex-row md:items-stretch">
        <div className="grid flex-1 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 md:divide-y-0">
          {heroFields.map((field) => (
            <div
              key={field.label}
              className="flex flex-col items-center justify-center px-4 py-4 text-center md:py-0"
            >
              <span className="text-sm text-black/40">{field.label}</span>
              <span className="text-md mt-0.5 font-semibold text-(--color-blue)">
                {field.value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center border-t border-black/10 p-3 md:border-t-0 md:px-3">
          <PrimaryButton
            width="180"
            height="48"
            text="Find Packages"
            logo={<Search size={18} />}
            textColor="--color-blue"
            onclick="/all-packages"
            textSize="16"
          />
        </div>
      </div>
    </div>
  );
}
