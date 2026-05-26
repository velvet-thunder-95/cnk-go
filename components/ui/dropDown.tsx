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
        className="hover:border-blue/70 flex w-full items-center justify-between border border-black/10 bg-white px-3 py-2 text-sm text-black/80 transition-colors focus:outline-none"
      >
        <span className={selected ? 'text-black/80' : 'text-gray'}>{selected ?? placeholder}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          className={`text-gray transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul className="border-white-secondary absolute z-50 mt-1 w-full overflow-hidden rounded border bg-white shadow-md">
          {options.map((option) => (
            <li
              key={option}
              onClick={() => handleSelect(option)}
              className={`hover:bg-blue/5 hover:text-blue cursor-pointer px-3 py-2 text-sm transition-colors ${selected === option ? 'bg-blue/5 text-blue' : 'text-black/80'}`}
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
