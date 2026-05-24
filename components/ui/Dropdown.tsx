'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  options: string[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({ options, placeholder = 'Select', onChange }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    setSelected(option);
    onChange?.(option);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded border border-black/10 bg-white px-3 py-2 text-sm text-[#171717] transition-colors hover:border-(--color-blue)/70 focus:outline-none"
      >
        <span className={selected ? 'text-[#171717]' : 'text-[#6B7280]'}>
          {selected ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          className={`text-[#6B7280] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded border border-[#E5E7EB] bg-white shadow-md">
          {options.map((option) => (
            <li
              key={option}
              onClick={() => handleSelect(option)}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-(--color-blue)/5 hover:text-(--color-blue) ${selected === option ? 'bg-(--color-blue)/5 text-(--color-blue)' : 'text-[#171717]'}`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
