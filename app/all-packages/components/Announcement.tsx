'use client';

import { useEffect, useState } from 'react';

interface AnnouncementBarProps {
  badge: string;
  message: string;
  expiresInSeconds?: number;
}

export default function AnnouncementBar({
  badge,
  message,
  expiresInSeconds = 45900,
}: AnnouncementBarProps) {
  const [timeLeft, setTimeLeft] = useState(expiresInSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="flex w-full items-center justify-between bg-[#1a2e4a] px-4 py-2.5 sm:px-6">
      <div className="flex flex-col items-start gap-3 md:flex-row md:items-center">
        <span className="rounded-full bg-(--color-yellow) px-3 py-1 text-xs font-bold text-white">
          {badge}
        </span>
        <p className="text-sm text-white">{message}</p>
      </div>
      <span className="font-mono text-sm text-white/70">
        {hours}:{minutes}:{seconds}
      </span>
    </div>
  );
}
