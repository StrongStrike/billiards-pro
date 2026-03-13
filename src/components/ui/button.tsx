import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[linear-gradient(135deg,rgba(39,230,245,0.28),rgba(45,255,138,0.18))] text-white ring-1 ring-cyan-300/30 hover:ring-cyan-200/60",
  secondary: "bg-white/6 text-slate-100 ring-1 ring-white/10 hover:bg-white/10",
  ghost: "bg-transparent text-slate-300 ring-1 ring-transparent hover:bg-white/6 hover:text-white",
  danger: "bg-rose-500/10 text-rose-200 ring-1 ring-rose-300/30 hover:bg-rose-500/20",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
