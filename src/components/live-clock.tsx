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
    let timer: number | undefined;

    const scheduleNextMinute = () => {
      const nextTick = new Date();
      nextTick.setSeconds(0, 0);
      nextTick.setMinutes(nextTick.getMinutes() + 1);
      timer = window.setTimeout(() => {
        setNow(new Date().toISOString());
        scheduleNextMinute();
      }, Math.max(1000, nextTick.getTime() - Date.now()));
    };

    scheduleNextMinute();

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  return (
    <div className="glass-panel relative min-w-[250px] overflow-hidden rounded-[30px] border border-white/8 px-5 py-4 text-center shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(39,230,245,0.5),transparent)]" />
      <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-200/80">Klub vaqti</div>
      <div className="mono-readout mt-3 font-display text-3xl font-bold text-white md:text-[2.3rem]">
        {formatClock(now, timezone)}
      </div>
      <div className="mt-3 h-px w-full rounded-full bg-[linear-gradient(90deg,transparent,rgba(39,230,245,0.5),transparent)]" />
      <div className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-400">
        {formatDateLabel(now, timezone)}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">{timezone}</div>
    </div>
  );
}
