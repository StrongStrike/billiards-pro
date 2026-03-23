"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, FileText, PackageSearch, SlidersHorizontal, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Panel } from "@/components/ui/panel";
import { ModalNote, ModalStat, ResponsiveModal } from "@/components/ui/responsive-modal";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { useBootstrapQuery, useReportsQuery } from "@/lib/hooks/use-club-data";
import { downloadExcelReport, printReportPdf } from "@/lib/report-export";
import { downloadCsv, formatCurrency, formatDateTimeLabel, formatDuration, toCsv } from "@/lib/utils";
import { MetricCard, SectionHeader } from "@/features/shared";
import type { ReportRange } from "@/types/club";

const ReportsRevenueChart = dynamic(
  () => import("@/components/charts/reports-revenue-chart").then((module) => module.ReportsRevenueChart),
  {
    ssr: false,
    loading: () => <div className="h-full rounded-[24px] border border-white/8 bg-white/[0.03]" />,
  },
);

const ReportsOccupancyChart = dynamic(
  () => import("@/components/charts/reports-occupancy-chart").then((module) => module.ReportsOccupancyChart),
  {
    ssr: false,
    loading: () => <div className="h-full rounded-[24px] border border-white/8 bg-white/[0.03]" />,
  },
);

function rangeLabel(range: ReportRange) {
  if (range === "day") {
    return "Kun";
  }
  if (range === "week") {
    return "Hafta";
  }
  if (range === "month") {
    return "Oy";
  }
  return "Yil";
}

function formatPercentage(value: number) {
  return `${Math.round(value)}%`;
}

export function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("day");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
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
  const { products, settings, tables } = bootstrapQuery.data;
  const adjustmentsAvailable = typeof (report as Partial<typeof report>).adjustmentsTotal === "number";
  const adjustmentsTotal = adjustmentsAvailable ? report.adjustmentsTotal : 0;
  const tablePerformance = Array.isArray((report as Partial<typeof report>).tablePerformance) ? report.tablePerformance : [];
  const categorySales = Array.isArray((report as Partial<typeof report>).categorySales) ? report.categorySales : [];
  const shiftHistory = Array.isArray((report as Partial<typeof report>).shiftHistory) ? report.shiftHistory : [];
  const lowStockAnalytics =
    Array.isArray((report as Partial<typeof report>).lowStockAnalytics) ? report.lowStockAnalytics : [];
  const cashDiscrepancyTotal =
    typeof (report as Partial<typeof report>).cashDiscrepancyTotal === "number" ? report.cashDiscrepancyTotal : 0;
  const leadTable = report.topTables[0];
  const leadProduct = report.topProducts[0];
  const selectedTableReport =
    tablePerformance.find((table) => table.tableId === selectedTableId) ??
    (() => {
      const fallback = report.topTables.find((table) => table.tableId === selectedTableId);
      return fallback
        ? {
            ...fallback,
            sessionsCount: 0,
            averageCheck: 0,
          }
        : null;
    })();
  const selectedTableSnapshot = tables.find((table) => table.id === selectedTableId) ?? null;
  const selectedProductReport = report.topProducts.find((product) => product.productId === selectedProductId) ?? null;
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const selectedProductCategory = selectedProduct
    ? bootstrapQuery.data.categories.find((category) => category.id === selectedProduct.categoryId)?.name ?? "Kategoriya"
    : null;

  const tableRevenueShare = selectedTableReport && report.revenue > 0 ? (selectedTableReport.revenue / report.revenue) * 100 : 0;
  const productRevenueShare =
    selectedProductReport && report.barRevenue > 0 ? (selectedProductReport.revenue / report.barRevenue) * 100 : 0;

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Hisobotlar"
        title={report.label}
        description={`Davr: ${formatDateTimeLabel(report.periodStart, report.timezone)} - ${formatDateTimeLabel(report.periodEnd, report.timezone)}`}
        action={
          <div className="flex flex-wrap gap-3">
            <div className="hidden flex-wrap gap-3 sm:flex">
              {(["day", "week", "month", "year"] as ReportRange[]).map((item) => (
                <Button
                  key={item}
                  variant={range === item ? "primary" : "secondary"}
                  onClick={() => setRange(item)}
                >
                  {rangeLabel(item)}
                </Button>
              ))}
            </div>
            <Button variant="secondary" className="gap-2 sm:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              Filtrlar
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              Eksport
            </Button>
          </div>
        }
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
            label="Billing tuzatish"
            value={formatCurrency(adjustmentsTotal, report.currency)}
            accent={adjustmentsAvailable ? "cyan" : "slate"}
            hint={adjustmentsAvailable ? "Qo'lda kiritilgan yozuvlar" : "Backend eski payload"}
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
        <StaggerItem>
          <MetricCard
            label="Kassa tafovuti"
            value={formatCurrency(cashDiscrepancyTotal, report.currency)}
            accent={cashDiscrepancyTotal === 0 ? "slate" : cashDiscrepancyTotal > 0 ? "green" : "amber"}
            hint={shiftHistory.length > 0 ? `${shiftHistory.length} smena kesimi` : "Smena ma'lumoti"}
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <Panel className="min-h-[360px] hud-frame" tone="cyan">
            <div className="font-display text-2xl font-bold text-white">Daromad grafigi</div>
            <div className="mt-5 h-72">
              <ReportsRevenueChart data={report.chart} />
            </div>
          </Panel>
        </Reveal>

        <Reveal>
          <Panel className="min-h-[360px] hud-frame" tone="amber">
            <div className="font-display text-2xl font-bold text-white">Bandlik ko&#39;rinishi</div>
            <div className="mt-5 h-72">
              <ReportsOccupancyChart data={report.chart} />
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
              <div className="sheen-surface rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Billing tuzatish</div>
                <div className="mt-2 font-semibold text-white">{formatCurrency(adjustmentsTotal, settings.currency)}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {adjustmentsAvailable
                    ? "Qo'lda kiritilgan billing tuzatishlari hisobotga qo'shilgan."
                    : "Joriy tashqi backend hali adjustmentsTotal maydonini yubormayapti."}
                </div>
              </div>
              <div className="sheen-surface rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Smena tafovuti</div>
                <div className="mt-2 font-semibold text-white">{formatCurrency(cashDiscrepancyTotal, settings.currency)}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {shiftHistory.length > 0
                    ? "Ochilgan va yopilgan smenalar bo'yicha kassa tafovuti yig'indisi."
                    : "Hisobot davrida smena yozuvlari topilmadi."}
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>

        <Reveal>
          <Panel tone="cyan" className="hud-frame">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-2xl font-bold text-white">Eng ko&#39;p ishlagan stollar</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Drawer detail
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {report.topTables.map((table) => (
                <button
                  key={table.tableId}
                  type="button"
                  onClick={() => setSelectedTableId(table.tableId)}
                  className="sheen-surface w-full rounded-[22px] border border-white/8 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/26 hover:bg-cyan-300/[0.06]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white">{table.tableName}</div>
                      <div className="mt-1 text-sm text-slate-400">{formatDuration(table.minutes)}</div>
                    </div>
                    <div className="font-display text-2xl font-bold text-cyan-200">
                      {formatCurrency(table.revenue, settings.currency)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </Reveal>

        <Reveal>
          <Panel tone="green" className="hud-frame">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-2xl font-bold text-white">Top mahsulotlar</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Drawer detail
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {report.topProducts.map((product) => (
                <button
                  key={product.productId}
                  type="button"
                  onClick={() => setSelectedProductId(product.productId)}
                  className="sheen-surface w-full rounded-[22px] border border-white/8 bg-white/[0.04] p-4 text-left transition hover:border-emerald-300/26 hover:bg-emerald-400/[0.05]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white">{product.productName}</div>
                      <div className="mt-1 text-sm text-slate-400">{product.quantity} dona</div>
                    </div>
                    <div className="font-display text-2xl font-bold text-emerald-200">
                      {formatCurrency(product.revenue, settings.currency)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </Reveal>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Reveal>
          <Panel tone="amber" className="hud-frame">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-2xl font-bold text-white">Smena tarixi va tafovut</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                {shiftHistory.length} smena
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {shiftHistory.length === 0 ? (
                <ModalNote tone="slate">Tanlangan davrda smena yozuvlari topilmadi.</ModalNote>
              ) : (
                shiftHistory.map((shift) => (
                  <div key={shift.shiftId} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-white">{shift.openedByOperatorName ?? shift.shiftId}</div>
                        <div className="mt-1 text-sm text-slate-400">
                          {formatDateTimeLabel(shift.openedAt, settings.timezone)}
                          {shift.closedAt ? ` - ${formatDateTimeLabel(shift.closedAt, settings.timezone)}` : " - Ochiq"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="data-chip">
                          {shift.status === "paused" ? "Pauza" : shift.status === "open" ? "Faol" : "Yopilgan"}
                        </div>
                        <div className="mt-2 font-display text-xl font-bold text-white">
                          {typeof shift.discrepancy === "number"
                            ? formatCurrency(shift.discrepancy, settings.currency)
                            : "Yakunlanmagan"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Tushum</div>
                        <div className="mt-2 font-semibold text-white">{formatCurrency(shift.revenue, settings.currency)}</div>
                      </div>
                      <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Kassa oqimi</div>
                        <div className="mt-2 font-semibold text-white">{formatCurrency(shift.cashMovementNet, settings.currency)}</div>
                      </div>
                      <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Kutilgan yakun</div>
                        <div className="mt-2 font-semibold text-white">{formatCurrency(shift.expectedCash, settings.currency)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </Reveal>

        <Reveal>
          <Panel tone="green" className="hud-frame">
            <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-display text-2xl font-bold text-white">Kategoriyalar bo&#39;yicha savdo</div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {categorySales.length} kategoriya
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {categorySales.length === 0 ? (
                    <ModalNote tone="slate">Tanlangan davrda kategoriya bo&#39;yicha savdo topilmadi.</ModalNote>
                  ) : (
                    categorySales.map((category) => (
                      <div key={category.categoryId} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="font-semibold text-white">{category.categoryName}</div>
                            <div className="mt-1 text-sm text-slate-400">{category.quantity} dona</div>
                          </div>
                          <div className="font-display text-xl font-bold text-emerald-200">
                            {formatCurrency(category.revenue, settings.currency)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-display text-2xl font-bold text-white">Low-stock analytics</div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {lowStockAnalytics.length} mahsulot
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {lowStockAnalytics.length === 0 ? (
                    <ModalNote tone="green">Kritik qoldiqdagi mahsulot topilmadi.</ModalNote>
                  ) : (
                    lowStockAnalytics.map((product) => (
                      <div key={product.productId} className="rounded-[22px] border border-amber-300/16 bg-amber-400/[0.07] p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="font-semibold text-white">{product.productName}</div>
                            <div className="mt-1 text-sm text-amber-100/80">{product.categoryName}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-xl font-bold text-amber-100">{product.stock}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-amber-100/70">
                              Threshold {product.threshold}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-amber-50/80">
                          Yetishmayotgan birlik: {product.gap}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>
      </div>

      <ResponsiveModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Hisobot filtrlari"
        description="Mobile va kichik ekranlarda davrni shu action modal ichida boshqaring."
        tone="slate"
        size="md"
        icon={<SlidersHorizontal className="h-5 w-5" />}
        headerMeta={
          <>
            <div className="data-chip">{rangeLabel(range)}</div>
            <div className="data-chip">{report.timezone}</div>
          </>
        }
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setFiltersOpen(false)}>
              Yopish
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <ModalStat label="Davr" value={rangeLabel(range)} hint="Joriy aktiv kesim" />
            <ModalStat label="Seanslar" value={`${report.sessionsCount}`} hint="Hisoblangan o'yinlar" />
            <ModalStat label="Bandlik" value={formatPercentage(report.occupancyRate)} hint="Davr bo'yicha" />
          </div>
          <ModalNote tone="slate">
            Tanlangan davr hisobot kartalari, grafiklar va top-list drilldownlarini birgalikda yangilaydi.
          </ModalNote>
          <div className="grid gap-3">
            {(["day", "week", "month", "year"] as ReportRange[]).map((item) => (
              <Button
                key={item}
                variant={range === item ? "primary" : "secondary"}
                className="justify-between"
                onClick={() => {
                  setRange(item);
                  setFiltersOpen(false);
                }}
              >
                <span>{rangeLabel(item)}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-current/70">
                  {item === "day" ? "24 soat" : item === "week" ? "7 kun" : item === "month" ? "Oy kesimi" : "Yillik"}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Hisobot eksporti"
        description="Eksport action alohida modalga ko'chirildi, shunda hisobot sahifasi page-first qoladi."
        tone="cyan"
        size="md"
        icon={<Download className="h-5 w-5" />}
        headerMeta={
          <>
            <div className="data-chip">{rangeLabel(range)}</div>
            <div className="data-chip">{report.chart.length} satr</div>
          </>
        }
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setExportOpen(false)}>
              Yopish
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                downloadCsv(`hisobot-${range}.csv`, csvPayload);
                setExportOpen(false);
              }}
            >
              <Download className="h-4 w-4" />
              CSV yuklab olish
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => {
                downloadExcelReport(report);
                setExportOpen(false);
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => {
                printReportPdf(report);
                setExportOpen(false);
              }}
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <ModalStat label="Davr" value={rangeLabel(range)} hint={report.label} />
            <ModalStat label="Tushum" value={formatCurrency(report.revenue, report.currency)} hint="Eksport snapshot" />
            <ModalStat label="Qatorlar" value={`${report.chart.length}`} hint="CSV chart rows" />
          </div>
          <ModalNote tone="cyan">
            Eksport joriy filtr, vaqt zona va hisobot snapshot bo&#39;yicha tayyorlanadi. Fayl operator qurilmasiga darhol yuklab olinadi.
          </ModalNote>
          {!adjustmentsAvailable ? (
            <ModalNote tone="amber">
              Tashqi backend hali billing tuzatishlar maydonini yubormayapti. CSV eksport ishlaydi, lekin adjustments kesimi bu deploymentda to&#39;liq emas.
            </ModalNote>
          ) : null}
          <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Eksport tarkibi</div>
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              <div>Davr kesimi va label</div>
              <div>Tushum, seanslar va bandlik foizi</div>
              <div>Billing tuzatish: {formatCurrency(adjustmentsTotal, report.currency)}</div>
              <div>Kassa tafovuti: {formatCurrency(cashDiscrepancyTotal, report.currency)}</div>
              <div>Joriy timezone: {report.timezone}</div>
            </div>
          </div>
        </div>
      </ResponsiveModal>

      <Drawer
        open={selectedTableReport !== null}
        onClose={() => setSelectedTableId(null)}
        title={selectedTableReport?.tableName ?? "Stol tafsiloti"}
        description="Tanlangan stolning shu hisobot davridagi yuklamasi va tushumi."
        tone="cyan"
        size="md"
        icon={<Table2 className="h-5 w-5" />}
        headerMeta={
          selectedTableSnapshot ? (
            <>
              <div className="data-chip">{selectedTableSnapshot.type === "vip" ? "VIP stol" : "Oddiy stol"}</div>
              <div className="data-chip">{formatCurrency(selectedTableSnapshot.hourlyRate, settings.currency)}</div>
            </>
          ) : undefined
        }
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setSelectedTableId(null)}>
              Yopish
            </Button>
          </div>
        }
      >
        {selectedTableReport ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <ModalStat label="Tushum" value={formatCurrency(selectedTableReport.revenue, settings.currency)} hint="Joriy davr" />
              <ModalStat label="Band vaqt" value={formatDuration(selectedTableReport.minutes)} hint="Yuklama" />
              <ModalStat label="Ulush" value={formatPercentage(tableRevenueShare)} hint="Jami tushumdan" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ModalStat label="Seanslar" value={`${selectedTableReport.sessionsCount}`} hint="Yopilgan seanslar" />
              <ModalStat
                label="O'rtacha chek"
                value={formatCurrency(selectedTableReport.averageCheck, settings.currency)}
                hint="Davr bo'yicha"
              />
            </div>
            <ModalNote tone={selectedTableSnapshot?.status === "active" ? "green" : "slate"}>
              {selectedTableSnapshot?.activeSession
                ? `${selectedTableSnapshot.name} hozir faol. Joriy mijoz: ${selectedTableSnapshot.activeSession.customerName}.`
                : "Bu drawer hisobot davridagi tarixiy ko'rsatkichlarni ko'rsatadi. Hozir faol session bo'lmasligi mumkin."}
            </ModalNote>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Keyingi bron</div>
                <div className="mt-3 font-semibold text-white">
                  {selectedTableSnapshot?.nextReservation
                    ? `${selectedTableSnapshot.nextReservation.customerName} | ${formatDateTimeLabel(selectedTableSnapshot.nextReservation.startAt, settings.timezone)}`
                    : "Navbatdagi bron yo'q"}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Joriy holat</div>
                <div className="mt-3 font-semibold text-white">
                  {selectedTableSnapshot
                    ? selectedTableSnapshot.status === "active"
                      ? "Band"
                      : selectedTableSnapshot.status === "reserved"
                        ? "Bron"
                        : "Bo'sh"
                    : "Snapshot yo'q"}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={selectedProductReport !== null}
        onClose={() => setSelectedProductId(null)}
        title={selectedProductReport?.productName ?? "Mahsulot tafsiloti"}
        description="Tanlangan mahsulotning shu hisobot davridagi sotuv ko'rsatkichlari."
        tone={selectedProduct && selectedProduct.stock <= selectedProduct.threshold ? "amber" : "green"}
        size="md"
        icon={<PackageSearch className="h-5 w-5" />}
        headerMeta={
          selectedProduct ? (
            <>
              <div className="data-chip">{selectedProductCategory}</div>
              <div className="data-chip">Qoldiq {selectedProduct.stock}</div>
            </>
          ) : undefined
        }
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setSelectedProductId(null)}>
              Yopish
            </Button>
          </div>
        }
      >
        {selectedProductReport ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <ModalStat label="Tushum" value={formatCurrency(selectedProductReport.revenue, settings.currency)} hint="Davr bo'yicha" />
              <ModalStat label="Sotildi" value={`${selectedProductReport.quantity} dona`} hint="Net birlik" />
              <ModalStat label="Ulush" value={formatPercentage(productRevenueShare)} hint="Bar tushumidan" />
            </div>
            <ModalNote tone={selectedProduct && selectedProduct.stock <= selectedProduct.threshold ? "amber" : "green"}>
              {selectedProduct && selectedProduct.stock <= selectedProduct.threshold
                ? "Mahsulot hali top-listda, lekin qoldiq kritik zonaga yaqin. Ombor modulida stock movement bilan tekshiring."
                : "Mahsulot savdoda yaxshi ishlagan. Kategoriya, qoldiq va narx snapshot shu drawer orqali tez ko'rinadi."}
            </ModalNote>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Kategoriya va birlik</div>
                <div className="mt-3 font-semibold text-white">
                  {selectedProductCategory} {selectedProduct ? `| ${selectedProduct.unit}` : ""}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Joriy narx</div>
                <div className="mt-3 font-semibold text-white">
                  {selectedProduct ? formatCurrency(selectedProduct.price, settings.currency) : "Ma'lumot yo'q"}
                </div>
              </div>
            </div>
            {selectedProduct && selectedProduct.stock <= selectedProduct.threshold ? (
              <ModalNote tone="amber">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                Past qoldiq: hozir {selectedProduct.stock}, threshold esa {selectedProduct.threshold}.
              </ModalNote>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
