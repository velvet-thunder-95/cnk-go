'use client';
import React from 'react';
import QueryParams from './QueryParams';
import QuickPlannerRight from './QuickPlannerRight';

const QuickPlanner: React.FC = () => {
  return (
    <div className="grid min-h-screen w-full gap-0 border border-[#E5E7EB] bg-white md:grid-cols-4 md:px-[64px] 2xl:grid-cols-9 2xl:px-[120px]">
      <div className="md:col-span-1 2xl:col-span-2">
        <QueryParams />
      </div>

      <div className="overflow-y-auto p-6 md:col-span-3 2xl:col-span-7">
        <QuickPlannerRight />
      </div>
    </div>
  );
};

export default QuickPlanner;
