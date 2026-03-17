import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const controlClassName =
  "w-full rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_28px_rgba(0,0,0,0.14)] outline-none backdrop-blur-xl transition duration-200 placeholder:text-slate-500 focus:border-cyan-300/55 focus:bg-white/[0.085] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_4px_rgba(39,230,245,0.08),0_16px_38px_rgba(7,40,46,0.24)]";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClassName, props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClassName, "min-h-28 resize-y", props.className)} {...props} />;
}
