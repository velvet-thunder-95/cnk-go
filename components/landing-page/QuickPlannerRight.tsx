'use client';
import React from 'react';
import { Plane, BedDouble, Upload, TrendingUp, Star, Plus, RefreshCw } from 'lucide-react';
import PrimaryButton from '@/ui/PrimaryButton';
import Image from 'next/image';

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
    id: 3,
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
];

const ResultCard: React.FC<{ card: ResultCard }> = ({ card }) => (
  <div className="flex max-w-[864px] flex-col overflow-hidden rounded border border-[#E5E7EB] bg-white">
    <div className="relative h-[200px] w-full overflow-hidden">
      <Image src={card.image} alt={card.node} fill className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      <div className="absolute top-3 left-3">
        <span className="flex items-center gap-1.5 rounded bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#171717] uppercase">
          <RefreshCw size={10} strokeWidth={2} />
          OPTIMAL INDEX
        </span>
      </div>

      <button className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded bg-white/90 text-[#171717] hover:bg-white">
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
          <span className="text-2xl font-bold text-[#171717]">
            ₹{card.price.toLocaleString('en-IN')}
          </span>
          <span className="text-sm text-[#6B7280] line-through">
            ₹{card.originalPrice.toLocaleString('en-IN')}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] tracking-wider text-[#6B7280]">PER ENTITY / GROSS TOTAL</p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#171717] uppercase">
            <Plane size={11} strokeWidth={2} />
            {card.route}
          </span>
          <span className="text-[10px] text-[#6B7280]">
            {card.airline} | {card.duration}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#171717] uppercase">
            <BedDouble size={11} strokeWidth={2} />
            {card.hotel}
          </span>
          <span className="text-[10px] text-[#6B7280]">
            {card.nights} NIGHTS | LVL {card.level}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#171717] uppercase">
            <Upload size={11} strokeWidth={2} />
            CLEARANCE: {card.clearance}
          </span>
          <span className="text-[10px] text-[#6B7280]">{card.processingTime}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-(--color-green) uppercase">
            <TrendingUp size={11} strokeWidth={2} />
            DELTA: {card.delta}
          </span>
          <span className="text-[10px] text-[#6B7280]">{card.efficiencyGain}</span>
        </div>
      </div>

      <PrimaryButton label="VIEW DETAILS" />

      <p className="text-center text-[10px] tracking-wider text-[#6B7280]">
        REFUNDABLE | ZERO VARIANCE
      </p>
    </div>
  </div>
);

const QuickPlannerRight: React.FC = () => {
  return (
    <div className="w-full">
      <p className="mb-4 text-sm font-bold text-[#171717]">
        <span>12 RESULTS</span>
        <span className="font-normal text-[#6B7280]"> | 4-5 NIGHTS | 2 ENTITIES</span>
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {cards.map((card) => (
          <ResultCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
};

export default QuickPlannerRight;
