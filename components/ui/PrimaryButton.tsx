import React from 'react';

interface ButtonProps {
  label: string;
  onClick?: () => void;
  className?: string;
}

const PrimaryButton: React.FC<ButtonProps> = ({ label, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded bg-(--color-blue) py-3 text-xs font-bold tracking-widest text-white uppercase transition-colors hover:bg-[#4538e0] active:bg-[#3a2ecc] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
};

export default PrimaryButton;
