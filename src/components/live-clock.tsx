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
    <div className="glass-panel relative min-w-[250px] overflow-hidden rounded-[30px] border border-white/8 px-5 py-4 text-center shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(39,230,245,0.5),transparent)]" />
      <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-200/80">Klub vaqti</div>
      <div className="mono-readout mt-3 font-display text-3xl font-bold text-white md:text-[2.3rem]">
        {formatClock(now, timezone)}
      </div>
      <div className="mt-3 h-0.5 w-full animate-pulse-line rounded-full bg-[linear-gradient(90deg,transparent,rgba(39,230,245,0.84),transparent)] shadow-[0_0_22px_rgba(39,230,245,0.55)]" />
      <div className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-400">
        {formatDateLabel(now, timezone)}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">{timezone}</div>
    </div>
  );
}
