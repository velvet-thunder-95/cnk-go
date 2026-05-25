'use client';
import React from 'react';
import { Plane, BedDouble, Upload, TrendingUp, Star, Plus, RefreshCw } from 'lucide-react';
import PrimaryButton from '@/components/ui/primaryButton';
import Image from 'next/image';
import Link from 'next/link';

interface ResultCard {
  id: number;
  image: string;
  node: string;
  region: string;
  rating: number;
  price: number;
  originalPrice: number;
  route: string;
  airline: string;
  duration: string;
  hotel: string;
  nights: number;
  level: number;
  clearance: string;
  processingTime: string;
  delta: string;
  efficiencyGain: string;
}

const cards: ResultCard[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80',
    node: 'GOA',
    region: 'INDIA',
    rating: 4.7,
    price: 48500,
    originalPrice: 63100,
    route: 'DIRECT ROUTE',
    airline: 'INDIGO',
    duration: '2H 20M',
    hotel: 'TAJ EXOTICA',
    nights: 5,
    level: 5,
    clearance: 'F',
    processingTime: '0 PROCESSING TIME',
    delta: '₹14,600',
    efficiencyGain: 'EFFICIENCY GAIN',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80',
    node: 'KERALA',
    region: 'INDIA',
    rating: 4.9,
    price: 52300,
    originalPrice: 71000,
    route: 'DIRECT ROUTE',
    airline: 'AIR INDIA',
    duration: '2H 45M',
    hotel: 'KUMARAKOM LAKE RESORT',
    nights: 6,
    level: 5,
    clearance: 'F',
    processingTime: '0 PROCESSING TIME',
    delta: '₹18,700',
    efficiencyGain: 'EFFICIENCY GAIN',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80',
    node: 'JAIPUR',
    region: 'INDIA',
    rating: 4.5,
    price: 31200,
    originalPrice: 44800,
    route: 'DIRECT ROUTE',
    airline: 'SPICEJET',
    duration: '1H 30M',
    hotel: 'RAMBAGH PALACE',
    nights: 4,
    level: 4,
    clearance: 'F',
    processingTime: '0 PROCESSING TIME',
    delta: '₹13,600',
    efficiencyGain: 'EFFICIENCY GAIN',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1625505826533-5c80aca7d157?w=800&q=80',
    node: 'ANDAMAN',
    region: 'INDIA',
    rating: 4.8,
    price: 67400,
    originalPrice: 89200,
    route: 'CONNECTING',
    airline: 'INDIGO',
    duration: '4H 10M',
    hotel: 'BAREFOOT RESORT',
    nights: 7,
    level: 5,
    clearance: 'F',
    processingTime: '0 PROCESSING TIME',
    delta: '₹21,800',
    efficiencyGain: 'EFFICIENCY GAIN',
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    node: 'MANALI',
    region: 'INDIA',
    rating: 4.6,
    price: 28900,
    originalPrice: 39500,
    route: 'DIRECT ROUTE',
    airline: 'AIR INDIA',
    duration: '1H 20M',
    hotel: 'THE ORCHARD GREENS',
    nights: 4,
    level: 3,
    clearance: 'F',
    processingTime: '0 PROCESSING TIME',
    delta: '₹10,600',
    efficiencyGain: 'EFFICIENCY GAIN',
  },
  {
    id: 6,
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80',
    node: 'DELHI',
    region: 'INDIA',
    rating: 4.3,
    price: 22100,
    originalPrice: 31400,
    route: 'DIRECT ROUTE',
    airline: 'VISTARA',
    duration: '2H 05M',
    hotel: 'THE IMPERIAL',
    nights: 3,
    level: 4,
    clearance: 'F',
    processingTime: '0 PROCESSING TIME',
    delta: '₹9,300',
    efficiencyGain: 'EFFICIENCY GAIN',
  },
];
interface ResultCardProps {
  card: ResultCard;
}
function ResultCard({ card }: ResultCardProps) {
  return (
    <div className="border-white-secondary flex max-w-[864px] flex-col overflow-hidden rounded border bg-white">
      <div className="relative h-[200px] w-full overflow-hidden">
        <Image src={card.image} alt={card.node} fill className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1.5 rounded bg-white/90 px-2.5 py-1 text-[12px] font-semibold tracking-wider text-black/80 uppercase">
            <RefreshCw size={10} strokeWidth={2} />
            OPTIMAL INDEX
          </span>
        </div>

        <button className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded bg-white/90 text-black/80 hover:bg-white">
          <Plus size={14} strokeWidth={2} />
        </button>

        <div className="absolute bottom-3 left-3">
          <p className="text-base font-semibold text-white">NODE: {card.node}</p>
          <p className="font text-[11px] tracking-wider">REGION: {card.region}</p>
        </div>

        <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded bg-black/40 px-2 py-0.5">
          <Star size={11} className="fill-white text-white" />
          <span className="text-xs font-semibold text-white">{card.rating}</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-black/80">
              ₹{card.price.toLocaleString('en-IN')}
            </span>
            <span className="text-gray text-sm line-through">
              ₹{card.originalPrice.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-gray mt-0.5 text-[11px] tracking-wider">PER ENTITY / GROSS TOTAL</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          <div className="flex min-h-[48px] flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wider text-black/80 uppercase">
              <Plane size={11} strokeWidth={2} />
              {card.route}
            </span>
            <span className="text-gray text-[12px]">
              {card.airline} | {card.duration}
            </span>
          </div>

          <div className="flex min-h-[60px] flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wider text-black/80 uppercase">
              <BedDouble size={11} strokeWidth={2} />
              {card.hotel}
            </span>
            <span className="text-gray text-[12px]">
              {card.nights} NIGHTS | LVL {card.level}
            </span>
          </div>

          <div className="flex min-h-[48px] flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wider text-black/80 uppercase md:text-[12px]">
              <Upload size={11} strokeWidth={2} />
              CLEARANCE: {card.clearance}
            </span>
            <span className="text-gray text-[12px]">{card.processingTime}</span>
          </div>

          <div className="flex min-h-[48px] flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-wider text-(--color-green) uppercase">
              <TrendingUp size={11} strokeWidth={2} />
              DELTA: {card.delta}
            </span>
            <span className="text-gray text-[12px]">{card.efficiencyGain}</span>
          </div>
        </div>
        <Link href={`/packages/${card.id}`}>
          <PrimaryButton label="VIEW DETAILS" className="py-3" />
        </Link>

        <p className="text-gray text-center text-[12px] tracking-wider">
          REFUNDABLE | ZERO VARIANCE
        </p>
      </div>
    </div>
  );
}

const QuickPlannerRight: React.FC = () => {
  return (
    <div className="w-full">
      <p className="mb-4 text-sm font-bold text-black/80">
        <span>12 RESULTS</span>
        <span className="text-gray font-normal"> | 4-5 NIGHTS | 2 ENTITIES</span>
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <ResultCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
};

export default QuickPlannerRight;
