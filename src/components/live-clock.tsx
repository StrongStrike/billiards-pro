"use client";

import { useEffect, useState } from "react";

import { formatClock, formatDateLabel } from "@/lib/utils";

export function LiveClock({
  timezone,
  initialNow,
}: {
  timezone: string;
  initialNow?: string;
}) {
  const [now, setNow] = useState(() => initialNow ?? new Date().toISOString());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex min-w-44 flex-col items-center justify-center">
      <div className="font-display text-3xl font-bold tracking-[0.2em] text-white">
        {formatClock(now, timezone)}
      </div>
      <div className="mt-2 h-0.5 w-24 animate-pulse-line rounded-full bg-cyan-300/70 shadow-[0_0_22px_rgba(39,230,245,0.55)]" />
      <div className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-400">
        {formatDateLabel(now, timezone)}
      </div>
    </div>
  );
}
