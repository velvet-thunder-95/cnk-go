import { Coffee, Car, GlassWater, type LucideIcon } from 'lucide-react';

interface Inclusion {
  label: string;
  icon: LucideIcon;
}

interface Props {
  items: Inclusion[];
}

export default function Inclusions({ items }: Props) {
  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="mb-4 text-lg font-bold text-(--color-blue)">Inclusions</p>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <item.icon className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-(--color-blue)">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { Coffee, Car, GlassWater };
