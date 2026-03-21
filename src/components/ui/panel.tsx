import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type PanelTone = "default" | "cyan" | "green" | "amber" | "slate";

const toneClasses: Record<PanelTone, string> = {
  default: "before:bg-[radial-gradient(circle_at_top_right,rgba(39,230,245,0.09),transparent_32%)]",
  cyan: "before:bg-[radial-gradient(circle_at_top_right,rgba(39,230,245,0.17),transparent_34%)]",
  green: "before:bg-[radial-gradient(circle_at_top_right,rgba(45,255,138,0.16),transparent_34%)]",
  amber: "before:bg-[radial-gradient(circle_at_top_right,rgba(244,195,78,0.18),transparent_34%)]",
  slate: "before:bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_34%)]",
};

export function Panel({
  className,
  children,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: PanelTone;
}) {
  return (
    <div
      className={cn(
        "glass-panel group relative overflow-hidden rounded-[32px] p-5 md:p-6",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-90 before:content-['']",
        "after:pointer-events-none after:absolute after:inset-x-6 after:top-0 after:h-px after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] after:content-['']",
        "shadow-[0_14px_34px_rgba(0,0,0,0.18)]",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%,transparent_76%,rgba(255,255,255,0.015))]" />
      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(39,230,245,0.16),transparent)]" />
      <div className="relative">{children}</div>
    </div>
  );
}
