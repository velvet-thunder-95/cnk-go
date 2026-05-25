'use client';
import React from 'react';
import QueryParams from './QueryParams';
import DestinationFinderRight from './DestintionFinderRight';

const DestinationFnder: React.FC = () => {
  return (
    <div className="border-white-secondary grid w-full gap-4 md:grid-cols-4 md:px-[64px] 2xl:grid-cols-9 2xl:px-[120px]">
      <div className="md:col-span-1 2xl:col-span-2">
        <QueryParams />
      </div>

      <div className="overflow-y-auto md:col-span-3 2xl:col-span-7">
        <DestinationFinderRight />
      </div>
    </div>
  );
};

export default DestinationFnder;
