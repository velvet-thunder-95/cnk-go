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
      className={`bg-blue hover:bg-blue/85 active:bg-blue w-full rounded text-xs font-bold tracking-widest text-white uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
};

export default PrimaryButton;
