"use client";

import { ModalNote, ModalStat } from "@/components/ui/responsive-modal";
import type { PrintableReceipt } from "@/lib/receipts";
import { formatCurrency, formatDateTimeLabel, formatDuration } from "@/lib/utils";

export function ReceiptPreview({ receipt }: { receipt: PrintableReceipt }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <ModalStat label="Kod" value={receipt.documentCode} hint={receipt.modeLabel} />
        <ModalStat label="Vaqt" value={formatDateTimeLabel(receipt.printedAt, receipt.timezone)} hint={receipt.operatorName} />
        <ModalStat label="Bar item" value={`${receipt.items.length}`} hint={receipt.tableName ?? "Counter flow"} />
        <ModalStat label="Jami" value={formatCurrency(receipt.total, receipt.currency)} hint={receipt.customerName ?? "Mijoz"} />
      </div>

      <ModalNote tone="cyan">
        Bu preview thermal printerning 80mm formatiga mos tayyorlanadi. Print bosilganda brauzerning tizimli chop etish oynasi bevosita ishga tushadi.
      </ModalNote>

      <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-2xl font-bold text-white">{receipt.clubName}</div>
            <div className="mt-1 text-sm text-slate-400">{receipt.title}</div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {receipt.documentCode}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Target</div>
            <div className="mt-2 font-medium text-white">{receipt.tableName ?? "Kassa savdosi"}</div>
            {receipt.customerName ? <div className="mt-1 text-slate-400">{receipt.customerName}</div> : null}
          </div>
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Seans</div>
            <div className="mt-2 font-medium text-white">
              {typeof receipt.sessionDurationMinutes === "number" ? formatDuration(receipt.sessionDurationMinutes) : "Counter"}
            </div>
            {receipt.sessionStartedAt ? (
              <div className="mt-1 text-slate-400">{formatDateTimeLabel(receipt.sessionStartedAt, receipt.timezone)}</div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {typeof receipt.gameCharge === "number" ? (
            <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
              <div className="text-slate-300">Stol vaqti</div>
              <div className="font-semibold text-white">{formatCurrency(receipt.gameCharge, receipt.currency)}</div>
            </div>
          ) : null}

          {receipt.items.map((item) => (
            <div key={`${item.name}-${item.quantity}`} className="flex items-center justify-between rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
              <div>
                <div className="font-medium text-white">{item.name}</div>
                <div className="mt-1 text-slate-400">
                  {item.quantity} x {formatCurrency(item.unitPrice, receipt.currency)}
                </div>
              </div>
              <div className="font-semibold text-white">{formatCurrency(item.total, receipt.currency)}</div>
            </div>
          ))}

          {receipt.adjustments.map((adjustment) => (
            <div key={`${adjustment.label}-${adjustment.reason}`} className="flex items-center justify-between rounded-[18px] border border-emerald-300/16 bg-emerald-400/[0.08] px-4 py-3 text-sm">
              <div>
                <div className="font-medium text-white">{adjustment.label}</div>
                <div className="mt-1 text-emerald-100/80">{adjustment.reason}</div>
              </div>
              <div className="font-semibold text-emerald-100">{adjustment.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[20px] border border-cyan-300/16 bg-cyan-300/[0.08] px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/70">Yakuniy summa</div>
          <div className="mt-2 font-display text-3xl font-bold text-white">{formatCurrency(receipt.total, receipt.currency)}</div>
        </div>
      </div>
    </div>
  );
}
