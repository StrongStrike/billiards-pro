"use client";

import { memo } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Dot, ReceiptText, Sparkles, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { TableIllustration } from "@/components/table-illustration";
import { tableStatusCopy } from "@/lib/constants";
import { cn, formatClock, formatCurrency, formatDuration } from "@/lib/utils";
import type { TableSnapshot } from "@/types/club";

function SectionHeaderComponent({
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
    <Reveal>
      <div className="page-shell hud-frame relative mb-6 overflow-hidden rounded-[32px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] px-5 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[36%] bg-[radial-gradient(circle_at_top_right,rgba(39,230,245,0.12),transparent_62%)]" />
        <div className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(39,230,245,0.22),transparent)]" />
        <div className="relative space-y-4">
          <div className="eyebrow-pill">{eyebrow}</div>
          <div>
            <h2 className="lux-title font-display text-3xl font-bold tracking-[-0.03em] md:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 md:text-[15px]">{description}</p>
          </div>
        </div>
        {action ? <div className="relative flex flex-wrap items-center gap-3">{action}</div> : null}
      </div>
    </Reveal>
  );
}

export const SectionHeader = memo(SectionHeaderComponent);

function MetricCardComponent({
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
  const border =
    accent === "green"
      ? "border-[#2DFF8A]/18"
      : accent === "amber"
        ? "border-[#F4C34E]/18"
        : accent === "slate"
          ? "border-white/10"
          : "border-[#27E6F5]/18";
  const signal =
    accent === "green" ? "signal-dot signal-dot--green" : accent === "amber" ? "signal-dot signal-dot--amber" : "signal-dot";

  return (
    <Reveal>
      <div>
        <Panel
          className={cn(
            "surface-accent sheen-surface relative overflow-hidden bg-gradient-to-br p-5 md:p-6",
            glow,
            border,
          )}
          tone={accent === "green" ? "green" : accent === "amber" ? "amber" : accent === "slate" ? "slate" : "cyan"}
        >
          <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.08),transparent)]" />
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={signal} />
                <div className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</div>
              </div>
              {hint ? (
                <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.035] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  {hint}
                </div>
              ) : null}
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.035] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Real vaqt
            </div>
          </div>
          <div className={cn("mt-5 font-display text-3xl font-bold tracking-[-0.03em] md:text-4xl", text)}>{value}</div>
          <div className="mt-4 h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.08),transparent)]" />
          <div className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">Operatsion snapshot</div>
        </Panel>
      </div>
    </Reveal>
  );
}

export const MetricCard = memo(MetricCardComponent);

function TableCardComponent({
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
  onSelect?: (tableId: string) => void;
  selected?: boolean;
}) {
  const status = tableStatusCopy[table.status];
  const statusAccent =
    table.status === "active"
      ? "from-[#2DFF8A]/16 via-[#2DFF8A]/6"
      : table.status === "reserved"
        ? "from-[#F4C34E]/18 via-[#F4C34E]/7"
        : "from-white/8 via-white/4";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(table.id)}
      className={cn(
        "glass-panel sheen-surface group relative w-full overflow-hidden rounded-[32px] p-4 text-left transition duration-200 hover:border-white/14",
        compact ? "min-h-[250px]" : "min-h-[300px]",
        selected
          ? "border-cyan-300/40 shadow-[0_0_22px_rgba(39,230,245,0.12)]"
          : "border-white/8 shadow-[0_10px_24px_rgba(0,0,0,0.16)]",
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80", statusAccent, "to-transparent")} />
      <div className="pointer-events-none absolute left-0 top-10 h-28 w-1 rounded-r-full bg-[linear-gradient(180deg,rgba(39,230,245,0.7),transparent)] opacity-70" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.24),transparent)]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-[1.7rem] font-bold tracking-[-0.04em] text-white">{table.name}</div>
            <div className="mt-1 text-sm text-slate-400">
              {table.type === "vip" ? "VIP stol" : "Oddiy stol"} <Dot className="mx-1 inline h-4 w-4 text-slate-600" />
              {formatCurrency(table.hourlyRate, currency)}
            </div>
          </div>
          <div className="space-y-2 text-right">
            <Badge className={status.className}>{status.label}</Badge>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">#{table.position}</div>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_62%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <TableIllustration
            accentColor={table.accentColor}
            dimmed={table.status === "free"}
            className="transition-transform duration-150"
          />
        </div>

        <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <div className="rounded-[20px] border border-white/6 bg-white/[0.03] px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <UserRound className="h-4 w-4 text-cyan-200" />
              Mijoz
            </div>
            <div className="mt-2 font-medium text-white">
              {table.activeSession?.customerName ?? table.nextReservation?.customerName ?? "Bo'sh stol"}
            </div>
          </div>
          <div className="rounded-[20px] border border-white/6 bg-white/[0.03] px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <Clock3 className="h-4 w-4 text-cyan-200" />
              Holat vaqti
            </div>
            <div className="mt-2 font-medium text-white">
              {table.currentSummary
                ? formatDuration(table.currentSummary.durationMinutes)
                : table.nextReservation
                  ? `${formatClock(table.nextReservation.startAt, timezone)} - ${formatClock(table.nextReservation.endAt, timezone)}`
                  : "Hozir bo'sh"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {table.currentSummary ? "Joriy hisob" : table.nextReservation ? "Keyingi bron" : "Tayyor"}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              {table.pendingOrderTotal > 0
                ? `Bar buyurtma: ${formatCurrency(table.pendingOrderTotal, currency)}`
                : "Qo'shimcha buyurtma yo'q"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold text-white">
              {table.currentSummary
                ? formatCurrency(table.currentSummary.total, currency)
                : table.nextReservation
                  ? formatClock(table.nextReservation.startAt, timezone)
                  : formatCurrency(table.hourlyRate, currency)}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
              Boshqarish
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export const TableCard = memo(TableCardComponent);

function EmptyStateComponent({
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
    <Panel className="flex min-h-56 flex-col items-center justify-center text-center" tone="slate">
      <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 p-4 text-cyan-200">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="mt-4 font-display text-2xl font-bold text-white">{title}</div>
      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">{description}</p>
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

export const EmptyState = memo(EmptyStateComponent);
