"use client";

import Link from "next/link";
import { Clock3, ReceiptText, Sparkles, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { TableIllustration } from "@/components/table-illustration";
import { tableStatusCopy } from "@/lib/constants";
import { cn, formatClock, formatCurrency, formatDuration } from "@/lib/utils";
import type { TableSnapshot } from "@/types/club";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.28em] text-cyan-300/75">{eyebrow}</div>
        <h2 className="mt-3 font-display text-3xl font-bold text-white">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  accent = "cyan",
  hint,
}: {
  label: string;
  value: string;
  accent?: "cyan" | "green" | "amber" | "slate";
  hint?: string;
}) {
  const glow =
    accent === "green"
      ? "from-[#2DFF8A]/18 to-transparent"
      : accent === "amber"
        ? "from-[#F4C34E]/18 to-transparent"
        : accent === "slate"
          ? "from-white/10 to-transparent"
          : "from-[#27E6F5]/18 to-transparent";
  const text =
    accent === "green"
      ? "text-[#2DFF8A]"
      : accent === "amber"
        ? "text-[#F4C34E]"
        : accent === "slate"
          ? "text-slate-300"
          : "text-[#27E6F5]";

  return (
    <Panel className={`relative overflow-hidden bg-gradient-to-br ${glow}`}>
      <div className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</div>
      <div className={cn("mt-4 font-display text-3xl font-bold", text)}>{value}</div>
      {hint ? <div className="mt-2 text-sm text-slate-400">{hint}</div> : null}
    </Panel>
  );
}

export function TableCard({
  table,
  currency,
  timezone,
  compact = false,
  onSelect,
  selected = false,
}: {
  table: TableSnapshot;
  currency: string;
  timezone: string;
  compact?: boolean;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const status = tableStatusCopy[table.status];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "glass-panel w-full rounded-[28px] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/14",
        compact ? "min-h-[230px]" : "min-h-[285px]",
        selected ? "border-cyan-300/40 shadow-[0_0_40px_rgba(39,230,245,0.14)]" : "border-white/8",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-2xl font-bold text-white">{table.name}</div>
          <div className="mt-1 text-sm text-slate-400">
            {table.type === "vip" ? "VIP stol" : "Oddiy stol"} |{" "}
            {formatCurrency(table.hourlyRate, currency)}
          </div>
        </div>
        <Badge className={status.className}>{status.label}</Badge>
      </div>

      <div className="mt-4">
        <TableIllustration accentColor={table.accentColor} dimmed={table.status === "free"} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-cyan-200" />
          <span>{table.activeSession?.customerName ?? table.nextReservation?.customerName ?? "Bo'sh stol"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-cyan-200" />
          <span>
            {table.currentSummary
              ? formatDuration(table.currentSummary.durationMinutes)
              : table.nextReservation
                ? `${formatClock(table.nextReservation.startAt, timezone)} - ${formatClock(table.nextReservation.endAt, timezone)}`
                : "Hozir bo'sh"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm text-slate-400">
          {table.currentSummary ? "Joriy hisob" : table.nextReservation ? "Keyingi bron" : "Tayyor"}
        </div>
        <div className="font-display text-2xl font-bold text-white">
          {table.currentSummary
            ? formatCurrency(table.currentSummary.total, currency)
            : table.nextReservation
              ? formatClock(table.nextReservation.startAt, timezone)
              : formatCurrency(table.hourlyRate, currency)}
        </div>
      </div>
    </button>
  );
}

export function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <Panel className="flex min-h-56 flex-col items-center justify-center text-center">
      <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-200">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="mt-4 font-display text-2xl font-bold text-white">{title}</div>
      <p className="mt-2 max-w-xl text-sm text-slate-400">{description}</p>
      {ctaHref && ctaLabel ? (
        <Link href={ctaHref} className="mt-5">
          <Button className="gap-2">
            <ReceiptText className="h-4 w-4" />
            {ctaLabel}
          </Button>
        </Link>
      ) : null}
    </Panel>
  );
}
