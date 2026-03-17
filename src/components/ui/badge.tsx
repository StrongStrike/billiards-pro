import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
