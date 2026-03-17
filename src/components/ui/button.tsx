import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-cyan-300/30 bg-[linear-gradient(135deg,rgba(39,230,245,0.4),rgba(45,255,138,0.22))] text-white shadow-[0_18px_44px_rgba(15,80,95,0.26),inset_0_1px_0_rgba(255,255,255,0.12)] hover:border-cyan-200/60 hover:shadow-[0_22px_48px_rgba(18,118,136,0.34),inset_0_1px_0_rgba(255,255,255,0.16)]",
  secondary:
    "border border-white/10 bg-white/[0.05] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/18 hover:bg-white/[0.09]",
  ghost:
    "border border-transparent bg-transparent text-slate-300 hover:border-white/8 hover:bg-white/[0.05] hover:text-white",
  danger:
    "border border-rose-300/24 bg-[linear-gradient(135deg,rgba(244,63,94,0.16),rgba(244,114,182,0.1))] text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-rose-200/40 hover:bg-[linear-gradient(135deg,rgba(244,63,94,0.22),rgba(244,114,182,0.14))]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 rounded-2xl px-3.5 text-sm",
  md: "min-h-11 rounded-[18px] px-4.5 text-sm",
  lg: "min-h-12 rounded-[20px] px-5 text-[15px]",
  icon: "h-11 w-11 rounded-full p-0",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden font-semibold tracking-[0.01em] transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111B] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50",
        "before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] before:content-['']",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
