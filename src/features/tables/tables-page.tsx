"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CirclePlay, Clock3, CupSoda, Play, Printer, Square, Ticket, TimerReset, WalletCards } from "lucide-react";

import { ReceiptPreview } from "@/components/print/receipt-preview";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ModalDismissButton } from "@/components/ui/modal-provider";
import { Panel } from "@/components/ui/panel";
import { ModalNote, ModalStat, ResponsiveModal } from "@/components/ui/responsive-modal";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { patchJson, postJson } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { openPrintDocument } from "@/lib/print";
import {
  buildReceiptHtml,
  createDocumentCode,
  type PrintableReceipt,
  type PrintableReceiptAdjustment,
  type PrintableReceiptLine,
} from "@/lib/receipts";
import { cn, formatClock, formatCurrency, formatDuration } from "@/lib/utils";
import { MetricCard, SectionHeader, TableCard } from "@/features/shared";
import type { BillAdjustment, Order, OrderItem, Product, Reservation, TableSnapshot } from "@/types/club";

const EMPTY_TABLES: TableSnapshot[] = [];
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_ORDERS: Order[] = [];
const EMPTY_ORDER_ITEMS: OrderItem[] = [];
const EMPTY_RESERVATIONS: Reservation[] = [];
const EMPTY_BILL_ADJUSTMENTS: BillAdjustment[] = [];

type TableModal = "start" | "extend" | "adjust" | "order" | "stop" | null;

function getAdjustmentLabel(type: BillAdjustment["type"]) {
  if (type === "discount") {
    return "Chegirma";
  }
  if (type === "compliment") {
    return "Komplement";
  }
  if (type === "free_minutes") {
    return "Bepul daqiqa";
  }
  return "Qo'lda qo'shilgan summa";
}

export function TablesPage() {
  const queryClient = useQueryClient();
  const bootstrapQuery = useBootstrapQuery();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [startCustomer, setStartCustomer] = useState("");
  const [startNote, setStartNote] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [extendMinutes, setExtendMinutes] = useState("30");
  const [adjustmentType, setAdjustmentType] = useState<BillAdjustment["type"]>("discount");
  const [adjustmentValue, setAdjustmentValue] = useState("30000");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<TableModal>(null);
  const [receiptPreview, setReceiptPreview] = useState<PrintableReceipt | null>(null);
  const [pending, startTransition] = useTransition();

  async function refreshData() {
    await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  }

  const handleTableSelect = useCallback((tableId: string) => {
    setSelectedTableId(tableId);
    setFeedback(null);
  }, []);

  function closeModal() {
    setActiveModal(null);
    setExtendMinutes("30");
    setAdjustmentType("discount");
    setAdjustmentValue("30000");
    setAdjustmentReason("");
  }

  function runAction(task: () => Promise<void>, successMessage: string, onSuccess?: () => void) {
    startTransition(async () => {
      try {
        setFeedback(null);
        await task();
        await refreshData();
        setFeedback(successMessage);
        onSuccess?.();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Xatolik yuz berdi");
      }
    });
  }

  const tables = bootstrapQuery.data?.tables ?? EMPTY_TABLES;
  const products = bootstrapQuery.data?.products ?? EMPTY_PRODUCTS;
  const settings = bootstrapQuery.data?.settings;
  const orders = bootstrapQuery.data?.orders ?? EMPTY_ORDERS;
  const orderItems = bootstrapQuery.data?.orderItems ?? EMPTY_ORDER_ITEMS;
  const reservations = bootstrapQuery.data?.reservations ?? EMPTY_RESERVATIONS;
  const billAdjustments =
    (bootstrapQuery.data as (typeof bootstrapQuery.data & { billAdjustments?: BillAdjustment[] }) | undefined)
      ?.billAdjustments ?? EMPTY_BILL_ADJUSTMENTS;
  const billAdjustmentsSupportAvailable = Array.isArray(
    (bootstrapQuery.data as { billAdjustments?: unknown[] } | undefined)?.billAdjustments,
  );
  const activeTablesCount = tables.filter((table) => table.status === "active").length;
  const reservedTablesCount = tables.filter((table) => table.status === "reserved").length;
  const freeTablesCount = tables.filter((table) => table.status === "free").length;
  const liveRevenue = tables.reduce((sum, table) => sum + (table.currentSummary?.total ?? 0), 0);
  const barReserveTotal = tables.reduce((sum, table) => sum + table.pendingOrderTotal, 0);
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
  const selectedPanelTone =
    selectedTable?.status === "active"
      ? "green"
      : selectedTable?.status === "reserved"
        ? "amber"
        : "slate";

  const selectedSessionOrderItems = useMemo(
    () =>
      selectedTable?.activeSession
        ? orderItems
            .filter((item) =>
              orders.some(
                (order) =>
                  order.id === item.orderId &&
                  order.sessionId === selectedTable.activeSession?.id &&
                  order.status === "confirmed",
              ),
            )
            .map((item) => ({
              ...item,
              productName: products.find((product) => product.id === item.productId)?.name ?? item.productId,
            }))
        : [],
    [orderItems, orders, products, selectedTable],
  );

  const selectedProduct = products.find((product) => product.id === productId) ?? null;
  const selectedLinkedReservation = useMemo(
    () =>
      selectedTable?.activeSession
        ? reservations.find(
            (reservation) =>
              reservation.sessionId === selectedTable.activeSession?.id &&
              (reservation.status === "arrived" || reservation.status === "scheduled"),
          ) ?? null
        : null,
    [reservations, selectedTable],
  );
  const selectedSessionAdjustments = useMemo(
    () =>
      selectedTable?.activeSession
        ? billAdjustments.filter((adjustment) => adjustment.sessionId === selectedTable.activeSession?.id)
        : [],
    [billAdjustments, selectedTable],
  );
  const selectedSessionReceiptLines = useMemo<PrintableReceiptLine[]>(
    () =>
      selectedSessionOrderItems.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.quantity,
      })),
    [selectedSessionOrderItems],
  );
  const selectedSessionAdjustmentLines = useMemo<PrintableReceiptAdjustment[]>(
    () =>
      selectedSessionAdjustments.map((adjustment) => ({
        label: getAdjustmentLabel(adjustment.type),
        value:
          adjustment.type === "free_minutes"
            ? `-${adjustment.minutes ?? 0} daqiqa`
            : `${adjustment.type === "manual_charge" ? "+" : "-"}${formatCurrency(adjustment.amount ?? 0, settings?.currency ?? "UZS")}`,
        reason: adjustment.reason,
      })),
    [selectedSessionAdjustments, settings?.currency],
  );
  const startModalDirty = startCustomer.trim() !== "" || startNote.trim() !== "";
  const extendModalDirty = extendMinutes !== "30";
  const adjustModalDirty =
    adjustmentReason.trim() !== "" || adjustmentValue !== "30000" || adjustmentType !== "discount";
  const orderModalDirty = productId !== "" || quantity !== "1";

  if (bootstrapQuery.isPending || !bootstrapQuery.data || !settings) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }

  const selectedSessionReceipt =
    selectedTable?.activeSession && selectedTable.currentSummary
      ? ({
          title: "Stol cheki",
          clubName: settings.clubName,
          documentCode: createDocumentCode("TABLE", selectedTable.activeSession.id),
          printedAt: new Date().toISOString(),
          timezone: settings.timezone,
          currency: settings.currency,
          operatorName: bootstrapQuery.data.operator.name,
          modeLabel: selectedTable.type === "vip" ? "VIP seans" : "Oddiy seans",
          tableName: selectedTable.name,
          customerName: selectedTable.activeSession.customerName,
          sessionStartedAt: selectedTable.activeSession.startedAt,
          sessionDurationMinutes: selectedTable.currentSummary.durationMinutes,
          gameCharge: selectedTable.currentSummary.gameCharge,
          items: selectedSessionReceiptLines,
          barTotal: selectedTable.currentSummary.orderTotal,
          adjustments: selectedSessionAdjustmentLines,
          total: selectedTable.currentSummary.total,
          notes: [
            selectedTable.pendingOrderTotal > 0
              ? `Bar buyurtma: ${formatCurrency(selectedTable.pendingOrderTotal, settings.currency)}`
              : "Bar buyurtma yo'q",
            selectedTable.currentSummary.freeMinutes > 0
              ? `Bepul daqiqa: ${selectedTable.currentSummary.freeMinutes}`
              : "Bepul daqiqa qo'llanmagan",
          ],
          footerNote: "Yakuniy stol cheki termal printer uchun tayyor.",
        } satisfies PrintableReceipt)
      : null;

  function handlePrintReceipt(receipt: PrintableReceipt) {
    try {
      openPrintDocument({
        title: receipt.documentCode,
        bodyHtml: buildReceiptHtml(receipt),
      });
      setFeedback("Chek uchun print oynasi ochildi");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Print oynasi ochilmadi");
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Stollar"
        title="Stollarni jonli boshqarish"
        description="Sahifa zal overview uchun qoldi. Har bir stol alohida drawer ichida ochiladi, seans, bar va checkout esa premium modal qatlamida yuradi."
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StaggerItem><MetricCard label="Band stollar" value={`${activeTablesCount}`} accent="green" hint="Faol seanslar" /></StaggerItem>
        <StaggerItem><MetricCard label="Bo'sh stollar" value={`${freeTablesCount}`} accent="slate" hint="Darhol ochish mumkin" /></StaggerItem>
        <StaggerItem><MetricCard label="Bron qilingan" value={`${reservedTablesCount}`} accent="amber" hint="Rejalashtirilgan kelishlar" /></StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Jonli hisob"
            value={formatCurrency(liveRevenue, settings.currency)}
            accent="cyan"
            hint="Faol stollar bo'yicha"
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Bar rezervi"
            value={formatCurrency(barReserveTotal, settings.currency)}
            accent="slate"
            hint="Tasdiqlangan buyurtmalar"
          />
        </StaggerItem>
      </Stagger>

      <Reveal>
        <Panel tone="slate" className="hud-frame">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.26em] text-cyan-300/70">Live floor map</div>
              <div className="mt-2 font-display text-2xl font-bold text-white">Zal kesimidagi barcha stollar</div>
              <div className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                Stol kartalari faqat real holatni ko&#39;rsatadi. Har bir karta bosilganda o&#39;zining detail drawer&#39;i ochiladi va asosiy amallar shu yerda boshlanadi.
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.035] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Faol seanslar</div>
                <div className="mt-2 font-display text-2xl font-bold text-white">{activeTablesCount}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.035] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Kutilayotgan bron</div>
                <div className="mt-2 font-display text-2xl font-bold text-white">{reservedTablesCount}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.035] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Interaction</div>
                <div className="mt-2 font-medium text-white">Drawer + modal</div>
              </div>
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
                selected={table.id === selectedTableId}
                onSelect={handleTableSelect}
              />
            ))}
          </div>
        </Panel>
      </Reveal>

      <Drawer
        open={Boolean(selectedTable)}
        onClose={() => setSelectedTableId(null)}
        title={selectedTable?.name ?? "Stol"}
        description="Stolning joriy holati, yaqindagi broni va checkout qatlamiga kirish shu drawer orqali boshqariladi."
        tone={selectedPanelTone}
        size="xl"
        icon={selectedTable?.activeSession ? <Ticket className="h-5 w-5" /> : <CirclePlay className="h-5 w-5" />}
        headerMeta={
          selectedTable ? (
            <>
              <div className="data-chip">{selectedTable.type === "vip" ? "VIP segment" : "Oddiy segment"}</div>
              <div className="data-chip">
                {selectedTable.status === "active" ? "Band" : selectedTable.status === "reserved" ? "Bron" : "Bo'sh"}
              </div>
            </>
          ) : undefined
        }
        footer={
          selectedTable ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="secondary" onClick={() => setSelectedTableId(null)} className="sm:min-w-36">
                Yopish
              </Button>
              {selectedTable.activeSession ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                  {selectedLinkedReservation ? (
                    <Button variant="secondary" className="gap-2 sm:min-w-40" onClick={() => setActiveModal("extend")}>
                      <TimerReset className="h-4 w-4" />
                      Vaqtni uzaytirish
                    </Button>
                  ) : null}
                  {selectedSessionReceipt ? (
                    <Button variant="secondary" className="gap-2 sm:min-w-40" onClick={() => setReceiptPreview(selectedSessionReceipt)}>
                      <Printer className="h-4 w-4" />
                      Chek
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    className="gap-2 sm:min-w-44"
                    onClick={() => setActiveModal("adjust")}
                    disabled={!billAdjustmentsSupportAvailable}
                  >
                    <WalletCards className="h-4 w-4" />
                    Tuzatish
                  </Button>
                  <Button variant="secondary" className="gap-2 sm:min-w-40" onClick={() => setActiveModal("order")}>
                    <CupSoda className="h-4 w-4" />
                    Bar qo&#39;shish
                  </Button>
                  <Button variant="danger" className="gap-2 sm:min-w-44" onClick={() => setActiveModal("stop")}>
                    <Square className="h-4 w-4" />
                    Seansni yakunlash
                  </Button>
                </div>
              ) : (
                <Button className="gap-2 sm:min-w-52" onClick={() => setActiveModal("start")}>
                  <Play className="h-4 w-4" />
                  Seansni boshlash
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {selectedTable ? (
          <div className="space-y-5">
            {feedback ? (
              <div
                className={cn(
                  "rounded-[22px] border px-4 py-3 text-sm",
                  feedback.toLowerCase().includes("xato") || feedback.toLowerCase().includes("kiriting")
                    ? "border-rose-300/20 bg-rose-500/10 text-rose-100"
                    : "border-emerald-300/18 bg-emerald-400/10 text-emerald-100",
                )}
              >
                {feedback}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ModalStat
                label="Tarif"
                value={formatCurrency(selectedTable.hourlyRate, settings.currency)}
                hint={selectedTable.type === "vip" ? "VIP stol" : "Oddiy stol"}
              />
              <ModalStat
                label="Keyingi bron"
                value={
                  selectedTable.nextReservation
                    ? formatClock(selectedTable.nextReservation.startAt, settings.timezone)
                    : "Yo'q"
                }
                hint={selectedTable.nextReservation?.customerName ?? "Darhol ishga tushirish mumkin"}
              />
              <ModalStat
                label="Joriy hisob"
                value={formatCurrency(selectedTable.currentSummary?.total ?? 0, settings.currency)}
                hint={selectedTable.activeSession?.customerName ?? "Aktiv seans yo'q"}
              />
              <ModalStat
                label={selectedLinkedReservation ? "Rejalangan tugash" : "Bar rezervi"}
                value={
                  selectedLinkedReservation
                    ? formatClock(selectedLinkedReservation.endAt, settings.timezone)
                    : formatCurrency(selectedTable.pendingOrderTotal, settings.currency)
                }
                hint={
                  selectedLinkedReservation
                    ? `${formatDuration(
                        Math.max(
                          Math.round(
                            (new Date(selectedLinkedReservation.endAt).getTime() - new Date(selectedLinkedReservation.startAt).getTime()) /
                              60000,
                          ),
                          0,
                        ),
                      )} slot band qilingan`
                    : `${selectedSessionOrderItems.length} ta aktiv pozitsiya`
                }
              />
            </div>

            {selectedTable.nextReservation ? (
              <ModalNote tone="amber">
                Keyingi bron: {selectedTable.nextReservation.customerName} |{" "}
                {formatClock(selectedTable.nextReservation.startAt, settings.timezone)} -{" "}
                {formatClock(selectedTable.nextReservation.endAt, settings.timezone)}
              </ModalNote>
            ) : (
              <ModalNote tone="slate">
                Bu stol bo&#39;sh va premium action-flow orqali darhol ishga tushirilishi mumkin.
              </ModalNote>
            )}

            {selectedTable.activeSession ? (
              <>
                {selectedLinkedReservation ? (
                  <ModalNote tone="cyan">
                    Faol seans bron bilan bog&#39;langan. Vaqtni uzaytirish modali orqali slotni 15, 30, 60 yoki 90 daqiqaga tez kengaytirishingiz mumkin.
                  </ModalNote>
                ) : (
                  <ModalNote tone="slate">
                    Bu seans open-ended tarzda ochilgan. Uzaytirish faqat seansga bog&#39;langan bron mavjud bo&#39;lsa kerak bo&#39;ladi.
                  </ModalNote>
                )}
                {!billAdjustmentsSupportAvailable ? (
                  <ModalNote tone="slate">
                    Billing tuzatishlari yangi backend qatlamida ishlaydi. PHP API yangilangach chegirma, komplement va bepul daqiqa shu drawer ichida faol bo&#39;ladi.
                  </ModalNote>
                ) : null}

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock3 className="h-4 w-4 text-cyan-200" />
                      Faol seans
                    </div>
                    <div className="mt-4 font-display text-3xl font-bold text-white">
                      {formatDuration(selectedTable.currentSummary?.durationMinutes ?? 0)}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      Boshlangan: {formatClock(selectedTable.activeSession.startedAt, settings.timezone)}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Ticket className="h-4 w-4 text-emerald-200" />
                      Mijoz
                    </div>
                    <div className="mt-4 font-display text-2xl font-bold text-white">
                      {selectedTable.activeSession.customerName}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">Session billing live davom etmoqda</div>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <CupSoda className="h-4 w-4 text-amber-200" />
                      Bar buyurtma
                    </div>
                    <div className="mt-4 font-display text-3xl font-bold text-white">
                      {formatCurrency(selectedTable.pendingOrderTotal, settings.currency)}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">Checkout bilan birga yopiladi</div>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <WalletCards className="h-4 w-4 text-violet-200" />
                      Billing tuzatish
                    </div>
                    <div className="mt-4 font-display text-3xl font-bold text-white">
                      {formatCurrency(selectedTable.currentSummary?.adjustmentAmount ?? 0, settings.currency)}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {selectedTable.currentSummary?.freeMinutes
                        ? `${selectedTable.currentSummary.freeMinutes} daqiqa bepul`
                        : `${selectedSessionAdjustments.length} ta adjustment`}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="font-semibold text-white">Joriy order stack</div>
                  <div className="mt-2 text-sm text-slate-400">
                    Drawer ichida faqat context ko&#39;rsatiladi. Buyurtma qo&#39;shish va checkout alohida modal bosqichlarida ochiladi.
                  </div>

                  <div className="mt-4 space-y-2">
                    {selectedSessionOrderItems.length === 0 ? (
                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-500">
                        Hozircha buyurtma yo&#39;q.
                      </div>
                    ) : (
                      selectedSessionOrderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm"
                        >
                          <span className="text-slate-200">
                            {item.productName} x {item.quantity}
                          </span>
                          <span className="font-semibold text-white">
                            {formatCurrency(item.unitPrice * item.quantity, settings.currency)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="font-semibold text-white">Billing tuzatishlari</div>
                  <div className="mt-2 text-sm text-slate-400">
                    Chegirma, komplement, bepul daqiqa va qo&#39;lda qo&#39;shilgan summa shu jurnal orqali checkout ichiga kiradi.
                  </div>

                  <div className="mt-4 space-y-2">
                    {selectedSessionAdjustments.length === 0 ? (
                      <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-500">
                        Hozircha billing tuzatishi yo&#39;q.
                      </div>
                    ) : (
                      selectedSessionAdjustments.map((adjustment) => (
                        <div
                          key={adjustment.id}
                          className="flex items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm"
                        >
                          <div>
                            <div className="font-medium text-white">
                              {adjustment.type === "discount"
                                ? "Chegirma"
                                : adjustment.type === "compliment"
                                  ? "Komplement"
                                  : adjustment.type === "free_minutes"
                                    ? "Bepul daqiqa"
                                    : "Qo&apos;lda qo&apos;shish"}
                            </div>
                            <div className="mt-1 text-slate-400">{adjustment.reason}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-white">
                              {adjustment.type === "free_minutes"
                                ? `${adjustment.minutes ?? 0} daqiqa`
                                : `${adjustment.type === "manual_charge" ? "+" : "-"}${formatCurrency(
                                    adjustment.amount ?? 0,
                                    settings.currency,
                                  )}`}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                              {formatClock(adjustment.createdAt, settings.timezone)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Stol tayyorligi</div>
                  <div className="mt-3 font-display text-3xl font-bold text-white">
                    {selectedTable.status === "reserved" ? "Bron" : "Bo'sh"}
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {selectedTable.status === "reserved"
                      ? "Avval bronni inobatga oling yoki darhol seansga aylantiring."
                      : "Walk-in mijoz uchun bir bosishda seans oching."}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Mijoz oqimi</div>
                  <div className="mt-3 font-display text-2xl font-bold text-white">
                    {selectedTable.nextReservation?.customerName ?? "Walk-in"}
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {selectedTable.nextReservation
                      ? "Yaqin kelish uchun stol ushlab turilgan."
                      : "Darhol boshlash mumkin."}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>

      {selectedTable ? (
        <>
          <ResponsiveModal
            open={activeModal === "start" && !selectedTable.activeSession}
            onClose={closeModal}
            title={`${selectedTable.name} uchun yangi seans`}
            description="Seansni alohida premium modal qatlamida oching. Stol overview joyini formalar emas, nazorat egallaydi."
            tone={selectedTable.status === "reserved" ? "amber" : "cyan"}
            icon={<CirclePlay className="h-5 w-5" />}
            closeGuard={{ when: startModalDirty }}
            headerMeta={
              <>
                <div className="data-chip">{selectedTable.type === "vip" ? "VIP stol" : "Oddiy stol"}</div>
                <div className="data-chip">{formatCurrency(selectedTable.hourlyRate, settings.currency)}</div>
              </>
            }
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <ModalDismissButton variant="secondary" className="sm:min-w-36" disabled={pending}>
                    Yopish
                  </ModalDismissButton>
                <Button form="start-session-form" type="submit" className="sm:min-w-44" disabled={pending}>
                  {pending ? "Boshlanmoqda..." : "Seansni boshlash"}
                </Button>
              </div>
            }
          >
            <form
              id="start-session-form"
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                runAction(
                  async () => {
                    if (!startCustomer.trim()) {
                      throw new Error("Mijoz ismini kiriting");
                    }
                    await postJson(`/api/tables/${selectedTable.id}/session/start`, {
                      customerName: startCustomer,
                      note: startNote,
                    });
                    setStartCustomer("");
                    setStartNote("");
                  },
                  "Seans muvaffaqiyatli boshlandi",
                  closeModal,
                );
              }}
            >
              {selectedTable.nextReservation ? (
                <ModalNote tone="amber">
                  Keyingi bron: {selectedTable.nextReservation.customerName} |{" "}
                  {formatClock(selectedTable.nextReservation.startAt, settings.timezone)} -{" "}
                  {formatClock(selectedTable.nextReservation.endAt, settings.timezone)}
                </ModalNote>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <ModalStat label="Tarif" value={formatCurrency(selectedTable.hourlyRate, settings.currency)} hint="Soatlik snapshot" />
                <ModalStat
                  label="Holat"
                  value={selectedTable.status === "reserved" ? "Bron mavjud" : "Tayyor"}
                  hint="Seans ochilgach billing darhol boshlanadi"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Mijoz ismi</label>
                  <Input
                    placeholder="Masalan: Azizbek"
                    value={startCustomer}
                    onChange={(event) => setStartCustomer(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Izoh</label>
                  <Input
                    placeholder="Masalan: turnir mashg&#39;uloti"
                    value={startNote}
                    onChange={(event) => setStartNote(event.target.value)}
                  />
                </div>
              </div>
            </form>
          </ResponsiveModal>

          <ResponsiveModal
            open={activeModal === "extend" && Boolean(selectedTable.activeSession) && Boolean(selectedLinkedReservation)}
            onClose={closeModal}
            title={`${selectedTable.name} vaqtini uzaytirish`}
            description="Faol seansga bog'langan bronning yakun vaqtini tez kengaytiring. Tizim boshqa bron bilan to'qnashuv bo'lsa, uzaytirishni bloklaydi."
            tone="amber"
            icon={<TimerReset className="h-5 w-5" />}
            closeGuard={{ when: extendModalDirty }}
            headerMeta={
              selectedLinkedReservation ? (
                <>
                  <div className="data-chip">{selectedLinkedReservation.customerName}</div>
                  <div className="data-chip">
                    {formatClock(selectedLinkedReservation.startAt, settings.timezone)} -{" "}
                    {formatClock(selectedLinkedReservation.endAt, settings.timezone)}
                  </div>
                </>
              ) : undefined
            }
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <ModalDismissButton variant="secondary" className="sm:min-w-36" disabled={pending}>
                    Yopish
                  </ModalDismissButton>
                <Button form="extend-session-form" type="submit" className="sm:min-w-44" disabled={pending}>
                  {pending ? "Uzaytirilmoqda..." : "Vaqtni uzaytirish"}
                </Button>
              </div>
            }
          >
            {selectedLinkedReservation ? (
              <form
                id="extend-session-form"
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction(
                    async () => {
                      const minutes = Number(extendMinutes);
                      if (!Number.isInteger(minutes) || minutes <= 0) {
                        throw new Error("Uzaytirish daqiqasini kiriting");
                      }

                      await patchJson(`/api/reservations/${selectedLinkedReservation.id}`, {
                        endAt: new Date(new Date(selectedLinkedReservation.endAt).getTime() + minutes * 60_000).toISOString(),
                      });
                      setExtendMinutes("30");
                    },
                    "Seans vaqti muvaffaqiyatli uzaytirildi",
                    closeModal,
                  );
                }}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <ModalStat
                    label="Joriy yakun"
                    value={formatClock(selectedLinkedReservation.endAt, settings.timezone)}
                    hint="Bron bilan band qilingan vaqt"
                  />
                  <ModalStat
                    label="Faol seans"
                    value={formatDuration(selectedTable.currentSummary?.durationMinutes ?? 0)}
                    hint={selectedTable.activeSession?.customerName ?? "Mijoz"}
                  />
                  <ModalStat
                    label="Bar rezervi"
                    value={formatCurrency(selectedTable.pendingOrderTotal, settings.currency)}
                    hint="Checkout ichida qoladi"
                  />
                </div>

                <div>
                  <div className="mb-2 block text-sm text-slate-400">Tez presetlar</div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[15, 30, 60, 90].map((value) => (
                      <Button
                        key={value}
                        variant={extendMinutes === String(value) ? "primary" : "secondary"}
                        onClick={() => setExtendMinutes(String(value))}
                        type="button"
                      >
                        +{value} daqiqa
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Qo&#39;lda daqiqa</label>
                    <Input
                      type="number"
                      min="5"
                      step="5"
                      value={extendMinutes}
                      onChange={(event) => setExtendMinutes(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Yangi yakun</label>
                    <Input
                      readOnly
                      value={formatClock(
                        new Date(
                          new Date(selectedLinkedReservation.endAt).getTime() +
                            Math.max(Number(extendMinutes) || 0, 0) * 60_000,
                        ).toISOString(),
                        settings.timezone,
                      )}
                    />
                  </div>
                </div>

                <ModalNote tone="amber">
                  Agar shu stol uchun keyingi bron bilan to&#39;qnashuv yuzaga kelsa, tizim uzaytirishni qabul qilmaydi.
                </ModalNote>
              </form>
            ) : null}
          </ResponsiveModal>

          <ResponsiveModal
            open={activeModal === "adjust" && Boolean(selectedTable.activeSession)}
            onClose={closeModal}
            title={`${selectedTable.name} billing tuzatishi`}
            description="Chegirma, komplement, bepul daqiqa yoki qo&#39;lda qo&#39;shimcha summani majburiy izoh bilan kiriting. Tuzatish checkout va hisobotlarga qo&#39;shiladi."
            tone="green"
            icon={<WalletCards className="h-5 w-5" />}
            closeGuard={{ when: adjustModalDirty }}
            headerMeta={
              <>
                <div className="data-chip">{selectedTable.activeSession?.customerName ?? "Seans"}</div>
                <div className="data-chip">
                  {formatCurrency(selectedTable.currentSummary?.total ?? 0, settings.currency)}
                </div>
              </>
            }
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <ModalDismissButton variant="secondary" className="sm:min-w-36" disabled={pending}>
                    Yopish
                  </ModalDismissButton>
                <Button
                  form="bill-adjustment-form"
                  type="submit"
                  className="sm:min-w-44"
                  disabled={pending || !billAdjustmentsSupportAvailable}
                >
                  {pending ? "Saqlanmoqda..." : "Tuzatishni qo'shish"}
                </Button>
              </div>
            }
          >
            <form
              id="bill-adjustment-form"
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                runAction(
                  async () => {
                    if (!billAdjustmentsSupportAvailable) {
                      throw new Error("Billing backend hali yangilanmagan");
                    }
                    if (!selectedTable.activeSession?.id) {
                      throw new Error("Faol seans topilmadi");
                    }
                    if (!adjustmentReason.trim()) {
                      throw new Error("Majburiy izohni kiriting");
                    }

                    const payload =
                      adjustmentType === "free_minutes"
                        ? {
                            sessionId: selectedTable.activeSession.id,
                            type: adjustmentType,
                            minutes: Number(adjustmentValue),
                            reason: adjustmentReason,
                          }
                        : {
                            sessionId: selectedTable.activeSession.id,
                            type: adjustmentType,
                            amount: Number(adjustmentValue),
                            reason: adjustmentReason,
                          };

                    await postJson("/api/bill-adjustments", payload);
                  },
                  "Billing tuzatishi qo'shildi",
                  closeModal,
                );
              }}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <ModalStat
                  label="Asosiy o'yin"
                  value={formatCurrency(
                    selectedTable.currentSummary?.baseGameCharge ?? selectedTable.currentSummary?.gameCharge ?? 0,
                    settings.currency,
                  )}
                  hint="Soatlik billing"
                />
                <ModalStat
                  label="Joriy tuzatish"
                  value={formatCurrency(selectedTable.currentSummary?.adjustmentAmount ?? 0, settings.currency)}
                  hint={
                    selectedTable.currentSummary?.freeMinutes
                      ? `${selectedTable.currentSummary.freeMinutes} bepul daqiqa`
                      : "Tuzatish jurnalidan"
                  }
                />
                <ModalStat
                  label="Yakuniy chek"
                  value={formatCurrency(selectedTable.currentSummary?.total ?? 0, settings.currency)}
                  hint="O'yin + bar + tuzatish"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[220px_160px]">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Tuzatish turi</label>
                  <Select
                    value={adjustmentType}
                    onChange={(event) => {
                      const nextType = event.target.value as BillAdjustment["type"];
                      setAdjustmentType(nextType);
                      setAdjustmentValue(nextType === "free_minutes" ? "15" : "30000");
                    }}
                  >
                    <option value="discount">Chegirma</option>
                    <option value="compliment">Komplement</option>
                    <option value="free_minutes">Bepul daqiqa</option>
                    <option value="manual_charge">Qo&apos;lda qo&apos;shish</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    {adjustmentType === "free_minutes" ? "Daqiqa" : "Summa"}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step={adjustmentType === "free_minutes" ? "5" : "1000"}
                    value={adjustmentValue}
                    onChange={(event) => setAdjustmentValue(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">Majburiy izoh</label>
                <Input
                  placeholder="Masalan: doimiy mijoz, servis xatosi yoki klub komplimenti"
                  value={adjustmentReason}
                  onChange={(event) => setAdjustmentReason(event.target.value)}
                />
              </div>

              <ModalNote tone="green">
                {adjustmentType === "free_minutes"
                  ? "Bepul daqiqa faqat o'yin summasidan ayriladi."
                  : adjustmentType === "manual_charge"
                    ? "Qo'lda qo'shilgan summa yakuniy chekni oshiradi."
                    : "Chegirma va komplement yakuniy chekni kamaytiradi."}
              </ModalNote>
            </form>
          </ResponsiveModal>

          <ResponsiveModal
            open={activeModal === "order" && Boolean(selectedTable.activeSession)}
            onClose={closeModal}
            title={`${selectedTable.name} uchun bar buyurtma`}
            description="Tasdiqlangan buyurtma aktiv seans hisobiga qo'shiladi va checkout vaqtida umumiy chek bilan yakunlanadi."
            tone="green"
            icon={<CupSoda className="h-5 w-5" />}
            closeGuard={{ when: orderModalDirty }}
            headerMeta={
              <>
                <div className="data-chip">{selectedTable.activeSession?.customerName ?? "Seans"}</div>
                <div className="data-chip">{selectedSessionOrderItems.length} ta pozitsiya</div>
              </>
            }
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <ModalDismissButton variant="secondary" className="sm:min-w-36" disabled={pending}>
                    Yopish
                  </ModalDismissButton>
                <Button form="table-order-form" type="submit" className="sm:min-w-44" disabled={pending}>
                  {pending ? "Qo'shilmoqda..." : "Buyurtma qo'shish"}
                </Button>
              </div>
            }
          >
            <form
              id="table-order-form"
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                runAction(
                  async () => {
                    if (!selectedTable.activeSession?.id) {
                      throw new Error("Aktiv seans topilmadi");
                    }
                    if (!productId) {
                      throw new Error("Mahsulotni tanlang");
                    }
                    await postJson("/api/orders", {
                      sessionId: selectedTable.activeSession.id,
                      tableId: selectedTable.id,
                      items: [{ productId, quantity: Number(quantity) }],
                    });
                    setProductId("");
                    setQuantity("1");
                  },
                  "Bar buyurtma muvaffaqiyatli qo'shildi",
                  closeModal,
                );
              }}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <ModalStat
                  label="Joriy bar summasi"
                  value={formatCurrency(selectedTable.pendingOrderTotal, settings.currency)}
                  hint="Tasdiqlangan mahsulotlar"
                />
                <ModalStat
                  label="Joriy chek"
                  value={formatCurrency(selectedTable.currentSummary?.total ?? 0, settings.currency)}
                  hint="O'yin + bar"
                />
                <ModalStat
                  label="Tanlangan mahsulot"
                  value={selectedProduct ? formatCurrency(selectedProduct.price, settings.currency) : "0 UZS"}
                  hint={selectedProduct?.name ?? "Mahsulot tanlanmagan"}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_140px]">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Mahsulot</label>
                  <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
                    <option value="">Mahsulot tanlang</option>
                    {products.filter((product) => product.isActive).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price, settings.currency)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Soni</label>
                  <Input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-white">Aktiv pozitsiyalar</div>
                {selectedSessionOrderItems.length === 0 ? (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-500">
                    Hozircha buyurtma yo&#39;q.
                  </div>
                ) : (
                  selectedSessionOrderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm"
                    >
                      <span className="text-slate-200">
                        {item.productName} x {item.quantity}
                      </span>
                      <span className="font-semibold text-white">
                        {formatCurrency(item.unitPrice * item.quantity, settings.currency)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </form>
          </ResponsiveModal>

          <ConfirmModal
            open={activeModal === "stop" && Boolean(selectedTable.activeSession)}
            onClose={closeModal}
            onConfirm={() => {
              const finalReceipt = selectedSessionReceipt;
              runAction(
                async () => {
                  await postJson(`/api/tables/${selectedTable.id}/session/stop`, {});
                },
                "Seans muvaffaqiyatli yakunlandi",
                () => {
                  closeModal();
                  setSelectedTableId(null);
                  if (finalReceipt) {
                    setReceiptPreview({
                      ...finalReceipt,
                      printedAt: new Date().toISOString(),
                    });
                  }
                },
              );
            }}
            title={`${selectedTable.name} seansini yakunlash`}
            description="Checkout vaqtida o'yin summasi va tasdiqlangan bar buyurtmalari birlashtirilib yakuniy chek hosil qilinadi."
            confirmLabel="Seansni yakunlash"
            confirmVariant="danger"
            pending={pending}
            tone="amber"
            stats={
              <div className="grid gap-4 sm:grid-cols-2">
                <ModalStat
                  label="Davomiylik"
                  value={formatDuration(selectedTable.currentSummary?.durationMinutes ?? 0)}
                  hint={
                    selectedTable.activeSession
                      ? `Boshlangan: ${formatClock(selectedTable.activeSession.startedAt, settings.timezone)}`
                      : undefined
                  }
                />
                <ModalStat
                  label="Yakuniy chek"
                  value={formatCurrency(selectedTable.currentSummary?.total ?? 0, settings.currency)}
                  hint={
                    selectedTable.currentSummary?.adjustmentAmount
                      ? `Tuzatish: ${formatCurrency(selectedTable.currentSummary.adjustmentAmount, settings.currency)}`
                      : `Bar: ${formatCurrency(selectedTable.pendingOrderTotal, settings.currency)}`
                  }
                />
              </div>
            }
          />
        </>
      ) : null}

      <ResponsiveModal
        open={Boolean(receiptPreview)}
        onClose={() => setReceiptPreview(null)}
        title="Stol cheki preview"
        description="Kassir bu oynada final session receiptni ko'rib, termal printerga chiqaradi. Seans yopilgandan keyin ham shu preview saqlanadi."
        tone="green"
        size="lg"
        icon={<Printer className="h-5 w-5" />}
        headerMeta={
          receiptPreview ? (
            <>
              <div className="data-chip">{receiptPreview.documentCode}</div>
              <div className="data-chip">{receiptPreview.tableName}</div>
            </>
          ) : undefined
        }
        footer={
          receiptPreview ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setReceiptPreview(null)}>
                Yopish
              </Button>
              <Button className="gap-2" onClick={() => handlePrintReceipt(receiptPreview)}>
                <Printer className="h-4 w-4" />
                Chekni chop etish
              </Button>
            </div>
          ) : undefined
        }
      >
        {receiptPreview ? <ReceiptPreview receipt={receiptPreview} /> : null}
      </ResponsiveModal>
    </div>
  );
}
