'use client';
import Dropdown from '@/components/ui/Dropdown';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { type QuickPlannerData } from '@/interface/QuickPlannerData';
import React, { useState } from 'react';

const QueryParams: React.FC = () => {
  const [data, setData] = useState<QuickPlannerData>();
  const [date, setDate] = useState('Jun 5, 2026');
  const [origin, setOrigin] = useState('Delhi (DEL)');
  const [duration, setDuration] = useState('4-5 Nights');
  const [pax, setPax] = useState('2 Entities');
  const [accommodation, setAccommodation] = useState('Level 5');
  const [clearance, setClearance] = useState('Unrestricted');

  const handleSearch = () => {
    setData({
      origin,
      date,
      duration,
      pax,
      accommodation,
      clearance,
    });
    console.log(data);
  };

  return (
    <div className="flex w-full flex-col gap-5 border border-[#E5E7EB] bg-white p-5 md:max-w-[256px] 2xl:max-w-[350px]">
      <h2 className="text-xs font-bold tracking-widest text-[#171717] uppercase">
        Query Parameters
      </h2>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold tracking-wider text-[#6B7280] uppercase">
          Origin Vector
        </label>
        <Dropdown
          options={[
            'Delhi (DEL)',
            'Mumbai (BOM)',
            'Bangalore (BLR)',
            'Chennai (MAA)',
            'Hyderabad (HYD)',
          ]}
          placeholder="Delhi (DEL)"
          onChange={setOrigin}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold tracking-wider text-[#6B7280] uppercase">
          T-Zero Date
        </label>
        <input
          type="text"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="focus:border-blue w-full rounded border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#171717] focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold tracking-wider text-[#6B7280] uppercase">
          Duration (Nights)
        </label>
        <Dropdown
          options={['1-2 Nights', '3-4 Nights', '4-5 Nights', '6-7 Nights', '8+ Nights']}
          placeholder="4-5 Nights"
          onChange={setDuration}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold tracking-wider text-[#6B7280] uppercase">
          Pax Count
        </label>
        <Dropdown
          options={['1 Entity', '2 Entities', '3 Entities', '4 Entities', '5+ Entities']}
          placeholder="2 Entities"
          onChange={setPax}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold tracking-wider text-[#6B7280] uppercase">
          Accommodation Tier
        </label>
        <Dropdown
          options={['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']}
          placeholder="Level 5"
          onChange={setAccommodation}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold tracking-wider text-[#6B7280] uppercase">
          Clearance Type
        </label>
        <Dropdown
          options={['Unrestricted', 'Budget', 'Premium', 'Luxury']}
          placeholder="Unrestricted"
          onChange={setClearance}
        />
      </div>

      <PrimaryButton label="Search" onClick={handleSearch} />
    </div>
  );
};

export default QueryParams;
