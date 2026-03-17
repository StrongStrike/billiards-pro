"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { useBootstrapQuery, useReportsQuery } from "@/lib/hooks/use-club-data";
import { downloadCsv, formatCurrency, formatDateTimeLabel, formatDuration, toCsv } from "@/lib/utils";
import { MetricCard, SectionHeader } from "@/features/shared";
import type { ReportRange } from "@/types/club";

export function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("day");
  const bootstrapQuery = useBootstrapQuery();
  const reportsQuery = useReportsQuery(range);

  const csvPayload = useMemo(() => {
    if (!reportsQuery.data) {
      return "";
    }
    return toCsv(
      reportsQuery.data.chart.map((point) => ({
        period: point.label,
        revenue: point.revenue,
        sessions: point.sessions,
        occupancy: point.occupancy,
      })),
      [
        { key: "period", label: "Davr" },
        { key: "revenue", label: "Tushum" },
        { key: "sessions", label: "Seanslar" },
        { key: "occupancy", label: "Bandlik %" },
      ],
    );
  }, [reportsQuery.data]);

  if (reportsQuery.isPending || !reportsQuery.data || bootstrapQuery.isPending || !bootstrapQuery.data) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }

  const report = reportsQuery.data;
  const { settings } = bootstrapQuery.data;
  const leadTable = report.topTables[0];
  const leadProduct = report.topProducts[0];

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Hisobotlar"
        title={report.label}
        description={`Davr: ${formatDateTimeLabel(report.periodStart, report.timezone)} - ${formatDateTimeLabel(report.periodEnd, report.timezone)}`}
        action={
          <div className="flex flex-wrap gap-3">
            {(["day", "month", "year"] as ReportRange[]).map((item) => (
              <Button
                key={item}
                variant={range === item ? "primary" : "secondary"}
                onClick={() => setRange(item)}
              >
                {item === "day" ? "Kun" : item === "month" ? "Oy" : "Yil"}
              </Button>
            ))}
            <Button variant="secondary" onClick={() => downloadCsv(`hisobot-${range}.csv`, csvPayload)}>
              CSV eksport
            </Button>
          </div>
        }
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <MetricCard
            label="Jami tushum"
            value={formatCurrency(report.revenue, report.currency)}
            hint={`${report.sessionsCount} ta seans`}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="O'yin tushumi"
            value={formatCurrency(report.gameRevenue, report.currency)}
            accent="green"
            hint={`${report.occupancyRate}% bandlik`}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Bar tushumi"
            value={formatCurrency(report.barRevenue, report.currency)}
            accent="amber"
            hint={leadProduct ? `${leadProduct.productName} yetakchi` : "Mahsulot ma'lumoti tayyor"}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="O'yin vaqti"
            value={formatDuration(report.playMinutes)}
            accent="slate"
            hint={leadTable ? `${leadTable.tableName} eng faol` : "Stollar kesimi"}
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <Panel className="min-h-[360px] hud-frame" tone="cyan">
          <div className="font-display text-2xl font-bold text-white">Daromad grafigi</div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
              <LineChart data={report.chart}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#8293ab" tickLine={false} axisLine={false} />
                <YAxis stroke="#8293ab" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,18,29,0.96)",
                    border: "1px solid rgba(39,230,245,0.18)",
                    borderRadius: "16px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Tushum" stroke="#27E6F5" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="sessions" name="Seanslar" stroke="#2DFF8A" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </Panel>
        </Reveal>

        <Reveal>
          <Panel className="min-h-[360px] hud-frame" tone="amber">
          <div className="font-display text-2xl font-bold text-white">Bandlik ko&#39;rinishi</div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
              <BarChart data={report.chart}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#8293ab" tickLine={false} axisLine={false} />
                <YAxis stroke="#8293ab" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,18,29,0.96)",
                    border: "1px solid rgba(39,230,245,0.18)",
                    borderRadius: "16px",
                  }}
                />
                <Bar dataKey="occupancy" name="Bandlik %" fill="#27E6F5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.72fr_1fr_1fr]">
        <Reveal>
          <Panel tone="slate" className="hud-frame">
          <div className="font-display text-2xl font-bold text-white">Qisqa insight</div>
          <div className="mt-5 space-y-3">
            <div className="sheen-surface rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Davr</div>
              <div className="mt-2 text-sm leading-7 text-white">
                {formatDateTimeLabel(report.periodStart, report.timezone)} -{" "}
                {formatDateTimeLabel(report.periodEnd, report.timezone)}
              </div>
            </div>
            <div className="sheen-surface rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Eng faol stol</div>
              <div className="mt-2 font-semibold text-white">{leadTable?.tableName ?? "Ma'lumot yo'q"}</div>
              <div className="mt-1 text-sm text-slate-400">
                {leadTable
                  ? `${formatDuration(leadTable.minutes)} | ${formatCurrency(leadTable.revenue, settings.currency)}`
                  : "Davr davomida faollik aniqlanmadi"}
              </div>
            </div>
            <div className="sheen-surface rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Top mahsulot</div>
              <div className="mt-2 font-semibold text-white">{leadProduct?.productName ?? "Ma'lumot yo'q"}</div>
              <div className="mt-1 text-sm text-slate-400">
                {leadProduct
                  ? `${leadProduct.quantity} dona | ${formatCurrency(leadProduct.revenue, settings.currency)}`
                  : "Bar savdosi hali qayd etilmagan"}
              </div>
            </div>
          </div>
          </Panel>
        </Reveal>

        <Reveal>
          <Panel tone="cyan" className="hud-frame">
          <div className="font-display text-2xl font-bold text-white">Eng ko&#39;p ishlagan stollar</div>
          <div className="mt-5 space-y-3">
            {report.topTables.map((table) => (
              <div key={table.tableId} className="sheen-surface rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">{table.tableName}</div>
                    <div className="mt-1 text-sm text-slate-400">{formatDuration(table.minutes)}</div>
                  </div>
                  <div className="font-display text-2xl font-bold text-cyan-200">
                    {formatCurrency(table.revenue, settings.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          </Panel>
        </Reveal>

        <Reveal>
          <Panel tone="green" className="hud-frame">
          <div className="font-display text-2xl font-bold text-white">Top mahsulotlar</div>
          <div className="mt-5 space-y-3">
            {report.topProducts.map((product) => (
              <div key={product.productId} className="sheen-surface rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">{product.productName}</div>
                    <div className="mt-1 text-sm text-slate-400">{product.quantity} dona</div>
                  </div>
                  <div className="font-display text-2xl font-bold text-emerald-200">
                    {formatCurrency(product.revenue, settings.currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
