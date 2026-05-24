'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import QuickPlanner from './QuickPlanner';
import DestinationFnder from './DestinationFinder';

const tabs = [
  { id: 'weekend', label: 'Quick Weekend Planner' },
  { id: 'destination', label: 'Destination Price Finder' },
];

const PlannerTabs: React.FC = () => {
  const [active, setActive] = useState('weekend');
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);

  return (
    <div className="">
      <div className="w-full border-b border-[#E5E7EB] bg-white">
        <div className="scrollbar-hide flex items-center overflow-x-auto px-3 pb-3 md:px-[64px]">
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                ref={isActive ? activeRef : null}
                onClick={() => setActive(tab.id)}
                className={`text-md relative flex min-w-60 shrink-0 cursor-pointer items-center gap-5 px-1 py-3.5 font-medium transition-colors duration-150 ${isActive ? 'text-(--color-blue)' : 'text-[#6B7280] hover:text-[#3D3D3D]'}`}
              >
                <Sparkles size={14} strokeWidth={1.8} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-(--color-blue)" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {active === 'weekend' ? <QuickPlanner /> : <DestinationFnder />}
    </div>
  );
};

export default PlannerTabs;
