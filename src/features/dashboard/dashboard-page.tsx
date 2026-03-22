"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, CalendarClock, ChevronRight, Gamepad2, HandCoins, Martini, ReceiptText, WalletCards } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input, Textarea } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { ModalDismissButton, useToast } from "@/components/ui/modal-provider";
import { ModalNote, ModalStat, ResponsiveModal } from "@/components/ui/responsive-modal";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { postJson } from "@/lib/client/api";
import { useBootstrapQuery, useDashboardActivityQuery } from "@/lib/hooks/use-club-data";
import { formatClock, formatCurrency, formatDateTimeLabel } from "@/lib/utils";
import { MetricCard, SectionHeader, TableCard } from "@/features/shared";
import type { BillAdjustment, CashMovement, Reservation, TableSnapshot } from "@/types/club";

const DashboardActivityChart = dynamic(
  () => import("@/components/charts/dashboard-activity-chart").then((module) => module.DashboardActivityChart),
  {
    ssr: false,
    loading: () => <div className="h-full rounded-[24px] border border-white/8 bg-white/[0.03]" />,
  },
);

type KpiModalKey = "revenue" | "tables" | "reservations" | "bar" | null;
const EMPTY_TABLES: TableSnapshot[] = [];
const EMPTY_RESERVATIONS: Reservation[] = [];
const EMPTY_CASH_MOVEMENTS: CashMovement[] = [];
const EMPTY_BILL_ADJUSTMENTS: BillAdjustment[] = [];
const cashMovementTypeCopy: Record<
  CashMovement["type"],
  { label: string; tone: "cyan" | "green" | "amber" | "slate"; sign: 1 | -1 }
> = {
  service_in: { label: "Xizmat kirimi", tone: "green", sign: 1 },
  service_out: { label: "Xizmat chiqimi", tone: "slate", sign: -1 },
  expense: { label: "Xarajat", tone: "amber", sign: -1 },
  cash_drop: { label: "Inkassatsiya", tone: "slate", sign: -1 },
  change: { label: "Razmen", tone: "cyan", sign: 1 },
};

export function DashboardPage() {
  const queryClient = useQueryClient();
  const bootstrapQuery = useBootstrapQuery();
  const activityQuery = useDashboardActivityQuery();
  const { pushToast } = useToast();
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashType, setCashType] = useState<CashMovement["type"]>("service_in");
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState("");
  const [cashPending, startCashTransition] = useTransition();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [kpiModal, setKpiModal] = useState<KpiModalKey>(null);
  const payload = bootstrapQuery.data;
  const tables = payload?.tables ?? EMPTY_TABLES;
  const reservations = payload?.reservations ?? EMPTY_RESERVATIONS;
  const cashMovements = payload?.cashMovements ?? EMPTY_CASH_MOVEMENTS;
  const billAdjustments =
    (payload as (typeof payload & { billAdjustments?: BillAdjustment[] }) | undefined)?.billAdjustments ??
    EMPTY_BILL_ADJUSTMENTS;
  const settings = payload?.settings;
  const kpis = payload?.kpis;
  const activity = activityQuery.data ?? [];
  const upcomingReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === "scheduled").slice(0, 4),
    [reservations],
  );
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
  const selectedReservation = reservations.find((reservation) => reservation.id === selectedReservationId) ?? null;
  const activeRevenueTables = tables.filter((table) => table.currentSummary).slice(0, 3);
  const recentCashMovements = cashMovements.slice(0, 4);
  const cashModalDirty = cashAmount.trim() !== "" || cashReason.trim() !== "";
  const cashDeskAvailable =
    typeof kpis?.cashOnHand === "number" &&
    typeof kpis?.cashAdjustmentNet === "number" &&
    typeof kpis?.cashMovementsToday === "number" &&
    Array.isArray(payload?.cashMovements);
  const billAdjustmentsAvailable = typeof kpis?.billAdjustmentsToday === "number" && Array.isArray(billAdjustments);
  const cashOnHand = cashDeskAvailable ? kpis.cashOnHand : 0;
  const cashAdjustmentNet = cashDeskAvailable ? kpis.cashAdjustmentNet : 0;
  const cashMovementsToday = cashDeskAvailable ? kpis.cashMovementsToday : 0;
  const billAdjustmentsToday = billAdjustmentsAvailable ? kpis.billAdjustmentsToday : 0;
  const recentBillAdjustments = billAdjustments.slice(0, 4);

  if (bootstrapQuery.isPending || !payload || !settings || !kpis) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }
  const kpiModalCopy =
    kpiModal === "revenue"
      ? {
          title: "Bugungi tushum",
          description: "O'yin va bar savdosidan yig'ilgan umumiy tushum shu blokda ko'rinadi.",
        }
      : kpiModal === "tables"
        ? {
            title: "Band stollar",
            description: "Faol seansdagi stollarni tez aniqlash va boshqarish uchun snapshot.",
          }
        : kpiModal === "reservations"
          ? {
              title: "Bronlar",
              description: "Bugungi rejalashtirilgan bronlar soni va yaqin kelishlar kesimi.",
            }
          : kpiModal === "bar"
            ? {
                title: "Bar savdosi",
                description: "Bugungi ichimlik va snack orderlaridan tushgan savdo hajmi.",
              }
            : null;

  function resetCashModal() {
    setCashType("service_in");
    setCashAmount("");
    setCashReason("");
    setCashModalOpen(false);
  }

  function submitCashMovement() {
    if (!cashDeskAvailable) {
      pushToast({
        title: "Backend yangilanmagan",
        description: "Kassa moduli tashqi API ga hali deploy qilinmagan.",
        tone: "error",
      });
      return;
    }

    startCashTransition(async () => {
      try {
        await postJson<{ ok: true }>("/api/cash-movements", {
          type: cashType,
          amount: Number(cashAmount),
          reason: cashReason,
        });
        await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
        pushToast({
          title: "Kassa harakati saqlandi",
          description: `${cashMovementTypeCopy[cashType].label} muvaffaqiyatli qayd etildi.`,
          tone: "success",
        });
        resetCashModal();
      } catch (error) {
        pushToast({
          title: "Kassa harakati saqlanmadi",
          description: error instanceof Error ? error.message : "Xatolik yuz berdi",
          tone: "error",
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Boshqaruv paneli"
        title="Jonli klub kuzatuvi"
        description="Markazda stol grid, o'ng tomonda klub dinamikasi va bugungi operatsion ko'rsatkichlar."
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/stollar"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-200/36 hover:bg-cyan-300/14"
            >
              Stollarni boshqarish
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/buyurtmalar"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.07] hover:text-white"
            >
              Bar buyurtmalari
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <button type="button" className="w-full text-left" onClick={() => setKpiModal("revenue")}>
            <MetricCard label="Bugungi tushum" value={formatCurrency(kpis.totalRevenue, settings.currency)} accent="cyan" />
          </button>
        </StaggerItem>
        <StaggerItem>
          <button type="button" className="w-full text-left" onClick={() => setKpiModal("tables")}>
            <MetricCard label="Band stollar" value={`${kpis.activeTables} / ${tables.length}`} accent="green" />
          </button>
        </StaggerItem>
        <StaggerItem>
          <button type="button" className="w-full text-left" onClick={() => setKpiModal("reservations")}>
            <MetricCard label="Bronlar" value={String(kpis.reservationsToday)} accent="amber" />
          </button>
        </StaggerItem>
        <StaggerItem>
          <button type="button" className="w-full text-left" onClick={() => setKpiModal("bar")}>
            <MetricCard label="Bar savdosi" value={formatCurrency(kpis.barRevenue, settings.currency)} accent="slate" />
          </button>
        </StaggerItem>
      </Stagger>

      <div className={settings.showRightRail ? "dashboard-grid" : "space-y-4"}>
        <Reveal className="space-y-4">
          <Panel className="hud-frame">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.26em] text-cyan-300/70">Stol statusi</div>
                <div className="mt-2 font-display text-2xl font-bold text-white">7 ta rus billiard stoli</div>
                <div className="mt-2 max-w-2xl text-sm text-slate-400">
                  Har bir karta joriy hisob, kutayotgan bron va bar yuklamasini bitta operatsion sirtga jamlaydi.
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                30 soniyada yangilanadi
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  currency={settings.currency}
                  timezone={settings.timezone}
                  compact
                  onSelect={setSelectedTableId}
                />
              ))}
            </div>
          </Panel>
        </Reveal>

        {settings.showRightRail ? (
          <div className="space-y-4">
            {settings.showActivityChart ? (
              <Reveal>
                <Panel className="min-h-[340px] hud-frame">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.26em] text-cyan-300/70">Klub dinamikasi</div>
                    <div className="mt-2 font-display text-2xl font-bold text-white">Yuklama grafigi</div>
                  </div>
                  <Activity className="h-6 w-6 text-cyan-200" />
                </div>
                <div className="mt-6 h-64">
                  <DashboardActivityChart data={activity} />
                </div>
                </Panel>
              </Reveal>
            ) : null}

            <Reveal>
              <Panel className="hud-frame">
              <div className="flex items-center justify-between">
                <div className="font-display text-2xl font-bold text-white">Yaqin bronlar</div>
                <CalendarClock className="h-5 w-5 text-amber-200" />
              </div>
              <div className="mt-5 space-y-3">
                {upcomingReservations.map((reservation) => (
                    <button
                      type="button"
                      key={reservation.id}
                      onClick={() => setSelectedReservationId(reservation.id)}
                      className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.03))] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white">{reservation.customerName}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {reservation.tableId.replace("table-", "Stol ")} | {reservation.guests} kishi
                          </div>
                        </div>
                        <div className="font-display text-2xl font-bold text-amber-200">
                          {formatClock(reservation.startAt, settings.timezone)}
                        </div>
                      </div>
                      <div className="mt-3 h-px w-full bg-[linear-gradient(90deg,rgba(244,195,78,0.24),transparent)]" />
                    </button>
                  ))}
              </div>
              </Panel>
            </Reveal>

            <Reveal>
              <Panel className="hud-frame">
              <div className="font-display text-2xl font-bold text-white">Bugungi kesim</div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "O'yin",
                    value: String(kpis.gamesToday),
                    icon: Gamepad2,
                    color: "text-cyan-200",
                  },
                  {
                    label: "Bar tushumi",
                    value: formatCurrency(kpis.barRevenue, settings.currency),
                    icon: Martini,
                    color: "text-emerald-200",
                  },
                  {
                    label: "Bandlik",
                    value: `${kpis.occupancyRate}%`,
                    icon: Activity,
                    color: "text-amber-200",
                  },
                  {
                    label: "Jami tushum",
                    value: formatCurrency(kpis.totalRevenue, settings.currency),
                    icon: WalletCards,
                    color: "text-white",
                  },
                  {
                    label: "Billing tuzatish",
                    value: String(billAdjustmentsToday),
                    icon: ReceiptText,
                    color: billAdjustmentsAvailable ? "text-cyan-200" : "text-slate-400",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <div className="mt-4 text-sm text-slate-400">{item.label}</div>
                    <div className={`mt-2 font-display text-2xl font-bold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
              </Panel>
            </Reveal>

            <Reveal>
              <Panel className="hud-frame" tone="amber">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.26em] text-amber-300/70">Kassa nazorati</div>
                    <div className="mt-2 font-display text-2xl font-bold text-white">Naqd pul oqimi</div>
                  </div>
                  <Button className="gap-2" onClick={() => setCashModalOpen(true)} disabled={!cashDeskAvailable}>
                    <HandCoins className="h-4 w-4" />
                    Kassa amali
                  </Button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="text-sm text-slate-400">Naqd qoldiq</div>
                    <div className="mt-2 font-display text-2xl font-bold text-white">
                      {formatCurrency(cashOnHand, settings.currency)}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="text-sm text-slate-400">Kassa tuzatishi</div>
                    <div className={`mt-2 font-display text-2xl font-bold ${cashAdjustmentNet >= 0 ? "text-emerald-200" : "text-amber-200"}`}>
                      {cashAdjustmentNet >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(cashAdjustmentNet), settings.currency)}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="text-sm text-slate-400">Bugungi amallar</div>
                    <div className="mt-2 font-display text-2xl font-bold text-cyan-200">{cashMovementsToday}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="text-sm text-slate-400">Billing tuzatishlar</div>
                    <div className={`mt-2 font-display text-2xl font-bold ${billAdjustmentsAvailable ? "text-cyan-200" : "text-slate-400"}`}>
                      {billAdjustmentsToday}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="text-sm text-slate-400">Oxirgi tuzatishlar</div>
                    <div className="mt-2 text-sm text-slate-300">
                      {billAdjustmentsAvailable
                        ? recentBillAdjustments.length > 0
                          ? `${recentBillAdjustments.length} ta yozuv jurnalga tushgan`
                          : "Bugun tuzatish kiritilmagan"
                        : "Backend deploy kutilmoqda"}
                    </div>
                  </div>
                </div>
                {!cashDeskAvailable ? (
                  <div className="mt-5 rounded-[22px] border border-amber-300/18 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    Kassa moduli frontendda tayyor, lekin joriy tashqi backend hali yangilanmagan. Backend deploy qilingach bu yerda real jurnal va amallar ishlaydi.
                  </div>
                ) : null}
                {cashDeskAvailable && !billAdjustmentsAvailable ? (
                  <div className="mt-3 rounded-[22px] border border-cyan-300/18 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
                    Billing tuzatishlari modeli frontda tayyor, lekin tashqi backend hali eski payload bilan ishlayapti.
                  </div>
                ) : null}
                <div className="mt-5 space-y-3">
                  {recentCashMovements.length === 0 ? (
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-500">
                      Kassa jurnali hali bo&#39;sh.
                    </div>
                  ) : (
                    recentCashMovements.map((movement) => {
                      const meta = cashMovementTypeCopy[movement.type];
                      return (
                        <div key={movement.id} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-white">{meta.label}</div>
                                <div className="data-chip">{formatDateTimeLabel(movement.createdAt, settings.timezone)}</div>
                              </div>
                              <div className="mt-2 text-sm leading-6 text-slate-400">{movement.reason}</div>
                            </div>
                            <div className={`font-display text-2xl font-bold ${meta.sign > 0 ? "text-emerald-200" : "text-amber-200"}`}>
                              {meta.sign > 0 ? "+" : "-"}
                              {formatCurrency(movement.amount, settings.currency)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Panel>
            </Reveal>
          </div>
        ) : null}
      </div>

      <Drawer
        open={selectedTable !== null}
        onClose={() => setSelectedTableId(null)}
        title={selectedTable?.name ?? "Stol tafsiloti"}
        description="Tanlangan stol bo'yicha joriy seans, pending order va yaqin bron shu drawer ichida ko'rinadi."
        tone={selectedTable?.status === "active" ? "green" : selectedTable?.status === "reserved" ? "amber" : "cyan"}
        size="lg"
        icon={<Gamepad2 className="h-5 w-5" />}
        headerMeta={
          selectedTable ? (
            <>
              <div className="data-chip">{selectedTable.type === "vip" ? "VIP" : "Oddiy"}</div>
              <div className="data-chip">{selectedTable.status === "active" ? "Band" : selectedTable.status === "reserved" ? "Bron" : "Bo'sh"}</div>
            </>
          ) : undefined
        }
        footer={
          selectedTable ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/buyurtmalar"
                className="inline-flex min-h-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-100 transition hover:border-white/18 hover:bg-white/[0.09]"
              >
                Bar buyurtmasi
              </Link>
              <Link
                href="/stollar"
                className="inline-flex min-h-11 items-center justify-center rounded-[18px] border border-cyan-300/30 bg-[linear-gradient(135deg,rgba(39,230,245,0.34),rgba(45,255,138,0.18))] px-4 text-sm font-semibold text-white transition hover:border-cyan-200/55 hover:brightness-105"
              >
                Stolni boshqarish
              </Link>
            </div>
          ) : undefined
        }
      >
        {selectedTable ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <ModalStat label="Soatlik tarif" value={formatCurrency(selectedTable.hourlyRate, settings.currency)} hint="Active rate" />
              <ModalStat label="Pending order" value={formatCurrency(selectedTable.pendingOrderTotal, settings.currency)} hint="Bar qo'shimchalari" />
              <ModalStat
                label="Joriy holat"
                value={selectedTable.currentSummary ? formatCurrency(selectedTable.currentSummary.total, settings.currency) : "Tayyor"}
                hint={selectedTable.currentSummary ? `${selectedTable.currentSummary.durationMinutes} daqiqa` : "Seans yo'q"}
              />
            </div>
            {selectedTable.activeSession ? (
              <ModalNote tone="green">
                Joriy seans: {selectedTable.activeSession.customerName}. Stol hozir faol va session bill real vaqtda hisoblanmoqda.
              </ModalNote>
            ) : selectedTable.nextReservation ? (
              <ModalNote tone="amber">
                Keyingi bron: {selectedTable.nextReservation.customerName} | {formatClock(selectedTable.nextReservation.startAt, settings.timezone)} - {formatClock(selectedTable.nextReservation.endAt, settings.timezone)}.
              </ModalNote>
            ) : (
              <ModalNote tone="cyan">Stol hozir bo&#39;sh va darhol yangi seans uchun tayyor.</ModalNote>
            )}
            <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
              <div className="text-sm font-semibold text-white">Action entry</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/stollar"
                  className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.07]"
                >
                  Seansni boshqarish
                </Link>
                <Link
                  href="/bronlar"
                  className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 transition hover:border-white/16 hover:bg-white/[0.07]"
                >
                  Bronlar timeline
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={selectedReservation !== null}
        onClose={() => setSelectedReservationId(null)}
        title={selectedReservation?.customerName ?? "Bron tafsiloti"}
        description="Yaqin bron bo'yicha mijoz, vaqt oralig'i va keyingi action-lar shu drawer ichida ko'rinadi."
        tone="amber"
        size="md"
        icon={<CalendarClock className="h-5 w-5" />}
        footer={
          selectedReservation ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/bronlar"
                className="inline-flex min-h-11 items-center justify-center rounded-[18px] border border-cyan-300/30 bg-[linear-gradient(135deg,rgba(39,230,245,0.34),rgba(45,255,138,0.18))] px-4 text-sm font-semibold text-white transition hover:border-cyan-200/55 hover:brightness-105"
              >
                Bronni ochish
              </Link>
            </div>
          ) : undefined
        }
      >
        {selectedReservation ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <ModalStat label="Stol" value={selectedReservation.tableId.replace("table-", "Stol ")} hint={`${selectedReservation.guests} kishi`} />
              <ModalStat label="Boshlanish" value={formatClock(selectedReservation.startAt, settings.timezone)} hint="Kelish vaqti" />
              <ModalStat label="Yakun" value={formatClock(selectedReservation.endAt, settings.timezone)} hint="Tugash vaqti" />
            </div>
            <ModalNote tone="amber">
              Telefon: {selectedReservation.phone}. {selectedReservation.note ? `Izoh: ${selectedReservation.note}` : "Qo'shimcha izoh kiritilmagan."}
            </ModalNote>
          </div>
        ) : null}
      </Drawer>

      <ResponsiveModal
        open={cashModalOpen}
        onClose={resetCashModal}
        title="Kassa harakati"
        description="Vneseniya, xarajat, inkassatsiya va razmen shu modal orqali alohida audit trail bilan yoziladi."
        tone={cashMovementTypeCopy[cashType].tone}
        size="md"
        icon={<HandCoins className="h-5 w-5" />}
        headerMeta={
          <>
            <div className="data-chip">{cashMovementTypeCopy[cashType].label}</div>
            <div className="data-chip">{formatCurrency(cashOnHand, settings.currency)}</div>
          </>
        }
        closeGuard={{ when: cashModalDirty }}
        hotkeys={[
          {
            key: "s",
            ctrlOrMeta: true,
            allowInInput: true,
            label: "Kassa harakatini saqlash",
            action: submitCashMovement,
          },
        ]}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <ModalDismissButton variant="secondary" disabled={cashPending}>
                Yopish
              </ModalDismissButton>
            <Button className="gap-2" onClick={submitCashMovement} disabled={cashPending}>
              <HandCoins className="h-4 w-4" />
              {cashPending ? "Saqlanmoqda..." : "Harakatni saqlash"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <ModalStat label="Naqd qoldiq" value={formatCurrency(cashOnHand, settings.currency)} hint="Joriy snapshot" />
            <ModalStat label="Tuzatishlar" value={formatCurrency(Math.abs(cashAdjustmentNet), settings.currency)} hint={cashAdjustmentNet >= 0 ? "Musbat oqim" : "Chiqim oqimi"} />
            <ModalStat label="Bugungi amallar" value={`${cashMovementsToday}`} hint="Jurnal satrlari" />
          </div>
          <ModalNote tone={cashMovementTypeCopy[cashType].tone}>
            Har bir kassa amali majburiy izoh bilan saqlanadi. Bu keyingi audit va smena reconciliation uchun asos bo&#39;ladi.
          </ModalNote>
          {!cashDeskAvailable ? (
            <ModalNote tone="amber">
              Joriy tashqi backend hali bu endpointni qo&#39;llamayapti. Kassa modali deploydan keyin aktiv bo&#39;ladi.
            </ModalNote>
          ) : null}
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Amal turi</label>
              <Select value={cashType} onChange={(event) => setCashType(event.target.value as CashMovement["type"])}>
                <option value="service_in">Xizmat kirimi</option>
                <option value="service_out">Xizmat chiqimi</option>
                <option value="expense">Xarajat</option>
                <option value="cash_drop">Inkassatsiya</option>
                <option value="change">Razmen</option>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Summa</label>
              <Input
                type="number"
                min="1"
                placeholder="Masalan 150000"
                value={cashAmount}
                onChange={(event) => setCashAmount(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Majburiy izoh</label>
              <Textarea
                placeholder="Masalan: smena boshida kassaga mayda pul qo'shildi"
                value={cashReason}
                onChange={(event) => setCashReason(event.target.value)}
              />
            </div>
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        open={kpiModal !== null}
        onClose={() => setKpiModal(null)}
        title={kpiModalCopy?.title ?? "KPI tafsiloti"}
        description={kpiModalCopy?.description}
        tone={kpiModal === "revenue" ? "cyan" : kpiModal === "tables" ? "green" : kpiModal === "reservations" ? "amber" : "slate"}
        size="md"
        icon={<ReceiptText className="h-5 w-5" />}
        footer={
          <div className="flex justify-end">
            <Link
              href={kpiModal === "revenue" || kpiModal === "bar" ? "/hisobotlar" : kpiModal === "tables" ? "/stollar" : "/bronlar"}
              className="inline-flex min-h-11 items-center justify-center rounded-[18px] border border-cyan-300/30 bg-[linear-gradient(135deg,rgba(39,230,245,0.34),rgba(45,255,138,0.18))] px-4 text-sm font-semibold text-white transition hover:border-cyan-200/55 hover:brightness-105"
            >
              Batafsil sahifaga o&#39;tish
            </Link>
          </div>
        }
      >
        <div className="space-y-5">
          {kpiModal === "revenue" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <ModalStat label="Bugungi tushum" value={formatCurrency(kpis.totalRevenue, settings.currency)} hint="Jami club revenue" />
                <ModalStat label="Bar qismi" value={formatCurrency(kpis.barRevenue, settings.currency)} hint="Paid orderlar" />
                <ModalStat
                  label="Billing tuzatishlar"
                  value={`${billAdjustmentsToday}`}
                  hint={billAdjustmentsAvailable ? "Chegirma, komplement, bepul daqiqa" : "Backend deploy kutilmoqda"}
                />
              </div>
              <div className="space-y-3">
                {activeRevenueTables.map((table) => (
                  <div key={table.id} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-white">{table.name}</div>
                      <div className="font-display text-xl font-bold text-cyan-200">
                        {formatCurrency(table.currentSummary?.total ?? 0, settings.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {kpiModal === "tables" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <ModalStat label="Band" value={`${kpis.activeTables}`} hint="Faol session" />
                <ModalStat label="Jami stol" value={`${tables.length}`} hint="Club capacity" />
              </div>
              <ModalNote tone="green">
                Aktiv stollarni tez boshqarish uchun stol kartasini bosing va drawer orqali detail oching.
              </ModalNote>
            </>
          ) : null}

          {kpiModal === "reservations" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <ModalStat label="Bugungi bronlar" value={`${kpis.reservationsToday}`} hint="Joriy kun" />
                <ModalStat label="Yaqin kelishlar" value={`${upcomingReservations.length}`} hint="Scheduled queue" />
              </div>
              <div className="space-y-3">
                {upcomingReservations.map((reservation: Reservation) => (
                  <div key={reservation.id} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{reservation.customerName}</div>
                        <div className="mt-1 text-sm text-slate-400">{reservation.tableId.replace("table-", "Stol ")} | {reservation.guests} kishi</div>
                      </div>
                      <div className="font-display text-xl font-bold text-amber-200">{formatClock(reservation.startAt, settings.timezone)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {kpiModal === "bar" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <ModalStat label="Bar tushumi" value={formatCurrency(kpis.barRevenue, settings.currency)} hint="Paid orderlar" />
                <ModalStat label="O'yin soni" value={`${kpis.gamesToday}`} hint="Bugungi sessionlar" />
              </div>
              <ModalNote tone="slate">
                Bar va snack flow uchun buyurtmalar ekranidagi wizard checkout asosiy operatsion nuqta bo&#39;lib xizmat qiladi.
              </ModalNote>
            </>
          ) : null}
        </div>
      </ResponsiveModal>
    </div>
  );
}
