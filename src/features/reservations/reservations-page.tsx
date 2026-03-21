"use client";

import { memo, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock, CheckCircle2, CircleX, PencilLine, TimerReset, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Drawer } from "@/components/ui/drawer";
import { Input, Textarea } from "@/components/ui/input";
import { useModalDismiss } from "@/components/ui/modal-provider";
import { Panel } from "@/components/ui/panel";
import { ModalNote, ModalStat, ResponsiveModal } from "@/components/ui/responsive-modal";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { patchJson, postJson } from "@/lib/client/api";
import { reservationStatusCopy } from "@/lib/constants";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { fromLocalDateTime } from "@/lib/time";
import { formatClock, formatDateTimeLabel } from "@/lib/utils";
import { EmptyState, MetricCard, SectionHeader } from "@/features/shared";
import type { ClubSettings, Reservation, TableSnapshot } from "@/types/club";

type ReservationFormValues = {
  tableId: string;
  customerName: string;
  phone: string;
  guests: number;
  startAt: string;
  endAt: string;
  note?: string;
};

type ReservationModalState =
  | { type: "create" }
  | { type: "edit"; reservation: Reservation }
  | null;

type ReservationConfirmState =
  | { type: "convert"; reservation: Reservation }
  | { type: "cancel"; reservation: Reservation }
  | { type: "complete"; reservation: Reservation }
  | null;

const TIMELINE_START_HOUR = 10;
const TIMELINE_END_HOUR = 24;
const SLOT_MINUTES = 30;

function slotLabels() {
  return Array.from(
    { length: ((TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60) / SLOT_MINUTES },
    (_, index) => {
      const hour = TIMELINE_START_HOUR + Math.floor((index * SLOT_MINUTES) / 60);
      const minute = (index * SLOT_MINUTES) % 60;
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    },
  );
}

function getCreateDefaults(selectedDay: string): ReservationFormValues {
  return {
    tableId: "",
    customerName: "",
    phone: "",
    guests: 2,
    startAt: `${selectedDay}T18:00`,
    endAt: `${selectedDay}T20:00`,
    note: "",
  };
}

function getEditDefaults(reservation: Reservation, timezone: string): ReservationFormValues {
  return {
    tableId: reservation.tableId,
    customerName: reservation.customerName,
    phone: reservation.phone,
    guests: reservation.guests,
    startAt: formatInTimeZone(reservation.startAt, timezone, "yyyy-MM-dd'T'HH:mm"),
    endAt: formatInTimeZone(reservation.endAt, timezone, "yyyy-MM-dd'T'HH:mm"),
    note: reservation.note ?? "",
  };
}

const ReservationsTimeline = memo(function ReservationsTimeline({
  tables,
  dayReservations,
  settings,
  resolvedSelectedDay,
  slots,
  onSelectReservation,
}: {
  tables: TableSnapshot[];
  dayReservations: Reservation[];
  settings: ClubSettings;
  resolvedSelectedDay: string;
  slots: string[];
  onSelectReservation: (reservationId: string) => void;
}) {
  return (
    <Panel tone="amber" className="hud-frame min-w-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl font-bold text-white">Kunlik timeline</div>
          <div className="mt-2 text-sm text-slate-400">
            30 daqiqalik slotlar bo&#39;yicha barcha stollar kesimi.
          </div>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300">
          {resolvedSelectedDay}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["scheduled", "arrived", "completed", "cancelled"] as const).map((status) => (
          <Badge key={status} className={reservationStatusCopy[status].className}>
            {reservationStatusCopy[status].label}
          </Badge>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-white/[0.035] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Tanlangan kun</div>
          <div className="mt-2 font-display text-xl font-bold text-white">{resolvedSelectedDay}</div>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-white/[0.035] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Timeline oralig&#39;i</div>
          <div className="mt-2 font-display text-xl font-bold text-white">
            {TIMELINE_START_HOUR}:00 - {TIMELINE_END_HOUR}:00
          </div>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-white/[0.035] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Faol kuzatuv</div>
          <div className="mt-2 inline-flex items-center gap-2 font-medium text-white">
            <span className="signal-dot" />
            Stol kesimi bo&#39;yicha
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[920px] space-y-3">
          <div
            className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-500"
            style={{ gridTemplateColumns: `140px repeat(${slots.length}, minmax(26px, 1fr))` }}
          >
            <div>Stol</div>
            {slots.map((slot, index) => (
              <div key={slot} className="text-center">
                {index % 2 === 0 ? slot : ""}
              </div>
            ))}
          </div>

          {tables.map((table) => {
            const tableReservations = dayReservations.filter((reservation) => reservation.tableId === table.id);
            return (
              <div
                key={table.id}
                className="grid gap-2 rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-3"
                style={{ gridTemplateColumns: `140px repeat(${slots.length}, minmax(26px, 1fr))` }}
              >
                <div className="flex items-center">
                  <div>
                    <div className="font-semibold text-white">{table.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{table.type === "vip" ? "VIP" : "Oddiy"}</div>
                  </div>
                </div>

                <div className="relative col-span-full grid" style={{ gridColumn: `2 / span ${slots.length}` }}>
                  <div className="grid h-16 gap-1" style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(26px, 1fr))` }}>
                    {slots.map((slot) => (
                      <div key={`${table.id}-${slot}`} className="rounded-xl border border-white/6 bg-white/[0.02]" />
                    ))}
                  </div>

                  <div
                    className="pointer-events-none absolute inset-0 grid"
                    style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(26px, 1fr))` }}
                  >
                    {tableReservations.map((reservation) => {
                      const startMinutes =
                        Number(formatInTimeZone(reservation.startAt, settings.timezone, "H")) * 60 +
                        Number(formatInTimeZone(reservation.startAt, settings.timezone, "m"));
                      const endMinutes =
                        Number(formatInTimeZone(reservation.endAt, settings.timezone, "H")) * 60 +
                        Number(formatInTimeZone(reservation.endAt, settings.timezone, "m"));
                      const startSlot = Math.max(
                        1,
                        Math.floor((startMinutes - TIMELINE_START_HOUR * 60) / SLOT_MINUTES) + 1,
                      );
                      const endSlot = Math.min(
                        slots.length + 1,
                        Math.ceil((endMinutes - TIMELINE_START_HOUR * 60) / SLOT_MINUTES) + 1,
                      );
                      const accent =
                        reservation.status === "cancelled"
                          ? "bg-slate-500/40"
                          : reservation.status === "completed"
                            ? "bg-white/12"
                            : reservation.status === "arrived"
                              ? "bg-[#2DFF8A]/35"
                              : "bg-[#F4C34E]/35";

                      return (
                        <button
                          type="button"
                          key={reservation.id}
                          onClick={() => onSelectReservation(reservation.id)}
                          className={`pointer-events-auto m-1 flex flex-col justify-center rounded-xl border border-white/10 px-3 text-left text-xs text-white shadow-[0_10px_20px_rgba(0,0,0,0.18)] transition hover:border-white/20 ${accent}`}
                          style={{ gridColumn: `${startSlot} / ${Math.max(endSlot, startSlot + 1)}` }}
                        >
                          <div className="truncate font-semibold">{reservation.customerName}</div>
                          <div className="truncate text-[11px] text-slate-200">
                            {formatDateTimeLabel(reservation.startAt, settings.timezone)} -{" "}
                            {formatDateTimeLabel(reservation.endAt, settings.timezone)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
});

export function ReservationsPage() {
  const bootstrapQuery = useBootstrapQuery();
  const queryClient = useQueryClient();
  const requestTopLayerClose = useModalDismiss();
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ReservationModalState>(null);
  const [confirmState, setConfirmState] = useState<ReservationConfirmState>(null);
  const [extendReservation, setExtendReservation] = useState<Reservation | null>(null);
  const [extendMinutes, setExtendMinutes] = useState("30");
  const timezone = bootstrapQuery.data?.settings.timezone ?? "Asia/Tashkent";
  const resolvedSelectedDay = selectedDay || formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isDirty },
  } = useForm<ReservationFormValues>({
    defaultValues: getCreateDefaults(resolvedSelectedDay),
  });

  async function refreshData() {
    await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  }

  const dayReservations = useMemo(
    () =>
      [...(bootstrapQuery.data?.reservations ?? [])]
        .filter(
          (reservation) =>
            formatInTimeZone(reservation.startAt, timezone, "yyyy-MM-dd") === resolvedSelectedDay,
        )
        .sort((left, right) => left.startAt.localeCompare(right.startAt)),
    [bootstrapQuery.data?.reservations, resolvedSelectedDay, timezone],
  );

  if (bootstrapQuery.isPending || !bootstrapQuery.data) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }

  const { tables, settings } = bootstrapQuery.data;
  const slots = slotLabels();
  const dayGuests = dayReservations.reduce((sum, reservation) => sum + reservation.guests, 0);
  const dayScheduled = dayReservations.filter((reservation) => reservation.status === "scheduled").length;
  const dayArrived = dayReservations.filter((reservation) => reservation.status === "arrived").length;
  const dayCompleted = dayReservations.filter((reservation) => reservation.status === "completed").length;
  const activeReservation = modalState?.type === "edit" ? modalState.reservation : null;
  const confirmReservation = confirmState?.reservation ?? null;
  const drawerReservation =
    dayReservations.find((reservation) => reservation.id === selectedReservationId) ?? null;
  const drawerTable = drawerReservation
    ? tables.find((table) => table.id === drawerReservation.tableId) ?? null
    : null;

  async function postReservation(values: ReservationFormValues) {
    await postJson<{ ok: true }>("/api/reservations", {
      ...values,
      guests: Number(values.guests),
      startAt: fromLocalDateTime(values.startAt, settings.timezone),
      endAt: fromLocalDateTime(values.endAt, settings.timezone),
    });
  }

  async function patchReservation(reservationId: string, payload: Record<string, unknown>) {
    await patchJson<{ ok: true }>(`/api/reservations/${reservationId}`, payload);
  }

  function openCreateModal() {
    clearErrors();
    setNotice(null);
    reset(getCreateDefaults(resolvedSelectedDay));
    setModalState({ type: "create" });
  }

  function openEditModal(reservation: Reservation) {
    clearErrors();
    setNotice(null);
    reset(getEditDefaults(reservation, settings.timezone));
    setModalState({ type: "edit", reservation });
    setSelectedReservationId(reservation.id);
  }

  function closeReservationModal() {
    setModalState(null);
  }

  function openExtendModal(reservation: Reservation) {
    setNotice(null);
    setExtendMinutes("30");
    setExtendReservation(reservation);
    setSelectedReservationId(reservation.id);
  }

  function runReservationAction(task: () => Promise<void>, successMessage: string, onSuccess?: () => void) {
    startTransition(async () => {
      setNotice(null);
      try {
        await task();
        await refreshData();
        setNotice({ type: "success", text: successMessage });
        onSuccess?.();
      } catch (error) {
        setNotice({
          type: "error",
          text: error instanceof Error ? error.message : "Amal bajarilmadi",
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Bronlar"
        title="Bronlar boshqaruvi"
        description="Timeline ko'rinishi page-first qoldi, yaratish va tahrirlash esa modal qatlamiga ko'chirildi. Bu layoutni tozalaydi va mobil flow'ni ancha kuchaytiradi."
        action={
          <Button className="gap-2" onClick={openCreateModal}>
            <CalendarClock className="h-4 w-4" />
            Yangi bron
          </Button>
        }
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><MetricCard label="Tanlangan kun" value={`${dayReservations.length}`} accent="amber" hint="Jami bronlar" /></StaggerItem>
        <StaggerItem><MetricCard label="Rejalashtirilgan" value={`${dayScheduled}`} accent="cyan" hint="Kelishi kutilmoqda" /></StaggerItem>
        <StaggerItem><MetricCard label="Kelganlar" value={`${dayArrived}`} accent="green" hint="Faol seans bilan" /></StaggerItem>
        <StaggerItem><MetricCard label="Mehmonlar" value={`${dayGuests}`} accent="slate" hint={`Yakunlangan: ${dayCompleted}`} /></StaggerItem>
      </Stagger>

      <Reveal>
        <Panel tone="cyan" className="hud-frame">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300/70">Booking control rail</div>
              <div className="mt-2 font-display text-2xl font-bold text-white">Timeline va action-modallar birlashtirildi</div>
              <div className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                Operator endi formani doimiy ko&#39;rmaydi. Kerakli paytda modal ochiladi, qolgan vaqtda esa timeline va bronlar ro&#39;yxati markaziy sahnada qoladi.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="date"
                className="w-full min-w-52 sm:w-auto"
                value={resolvedSelectedDay}
                onChange={(event) => setSelectedDay(event.target.value)}
              />
              <Button variant="secondary" className="gap-2" onClick={openCreateModal}>
                <CalendarClock className="h-4 w-4" />
                Bron oynasini ochish
              </Button>
            </div>
          </div>
          {notice ? (
            <div
              className={`mt-4 rounded-[22px] border px-4 py-3 text-sm ${
                notice.type === "error"
                  ? "border-rose-300/20 bg-rose-500/10 text-rose-200"
                  : "border-emerald-300/20 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {notice.text}
            </div>
          ) : null}
        </Panel>
      </Reveal>

      <div className="space-y-5">
        <Reveal>
          <ReservationsTimeline
            tables={tables}
            dayReservations={dayReservations}
            settings={settings}
            resolvedSelectedDay={resolvedSelectedDay}
            slots={slots}
            onSelectReservation={setSelectedReservationId}
          />
        </Reveal>

        <Reveal>
          <Panel tone="slate" className="hud-frame">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-2xl font-bold text-white">Kun bo&#39;yicha bronlar</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                {resolvedSelectedDay}
              </div>
            </div>
            {dayReservations.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Tanlangan kun bo&#39;yicha bron yo&#39;q"
                  description="Timeline yuqorisidan boshqa kunni tanlang yoki yangi bron modalini oching."
                />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {dayReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedReservationId(reservation.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedReservationId(reservation.id);
                      }
                    }}
                    className="w-full rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.025))] p-5 text-left transition hover:border-white/14 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-white">{reservation.customerName}</div>
                          <Badge className={reservationStatusCopy[reservation.status].className}>
                            {reservationStatusCopy[reservation.status].label}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-slate-400">
                          {(tables.find((table) => table.id === reservation.tableId)?.name ?? reservation.tableId)} | {formatClock(reservation.startAt, settings.timezone)} -{" "}
                          {formatClock(reservation.endAt, settings.timezone)} | {reservation.guests} kishi
                        </div>
                        <div className="mt-2 text-sm text-slate-500">{reservation.phone}</div>
                        {reservation.note ? <div className="mt-2 text-sm text-slate-400">{reservation.note}</div> : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {reservation.status === "scheduled" || reservation.status === "arrived" ? (
                          <Button
                            variant="secondary"
                            className="gap-2"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(reservation);
                            }}
                          >
                            <PencilLine className="h-4 w-4" />
                            Tahrirlash
                          </Button>
                        ) : null}

                        {reservation.status === "scheduled" || reservation.status === "arrived" ? (
                          <Button
                            variant="secondary"
                            className="gap-2"
                            onClick={(event) => {
                              event.stopPropagation();
                              openExtendModal(reservation);
                            }}
                          >
                            <TimerReset className="h-4 w-4" />
                            Uzaytirish
                          </Button>
                        ) : null}

                        {reservation.status === "scheduled" ? (
                          <>
                            <Button
                              variant="secondary"
                              className="gap-2"
                              onClick={(event) => {
                                event.stopPropagation();
                                setConfirmState({ type: "convert", reservation });
                              }}
                            >
                              <WandSparkles className="h-4 w-4" />
                              Seansga aylantirish
                            </Button>
                            <Button
                              variant="danger"
                              className="gap-2"
                              onClick={(event) => {
                                event.stopPropagation();
                                setConfirmState({ type: "cancel", reservation });
                              }}
                            >
                              <CircleX className="h-4 w-4" />
                              Bekor qilish
                            </Button>
                          </>
                        ) : null}

                        {reservation.status === "arrived" ? (
                          <Button
                            variant="secondary"
                            className="gap-2"
                            onClick={(event) => {
                              event.stopPropagation();
                              setConfirmState({ type: "complete", reservation });
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Yakunlangan deb belgilash
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </Reveal>
      </div>

      <Drawer
        open={Boolean(drawerReservation)}
        onClose={() => setSelectedReservationId(null)}
        title={drawerReservation?.customerName ?? "Bron tafsiloti"}
        description="Bron tafsiloti, statusi va asosiy tezkor amallar shu drawer orqali bajariladi."
        tone={
          drawerReservation?.status === "arrived"
            ? "green"
            : drawerReservation?.status === "completed"
              ? "slate"
              : "amber"
        }
        size="lg"
        icon={<CalendarClock className="h-5 w-5" />}
        headerMeta={
          drawerReservation ? (
            <>
              <div className="data-chip">{reservationStatusCopy[drawerReservation.status].label}</div>
              <div className="data-chip">{formatClock(drawerReservation.startAt, settings.timezone)}</div>
            </>
          ) : undefined
        }
        footer={
          drawerReservation ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="secondary" onClick={() => setSelectedReservationId(null)} className="sm:min-w-36">
                Yopish
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                {(drawerReservation.status === "scheduled" || drawerReservation.status === "arrived") ? (
                  <>
                    <Button
                      variant="secondary"
                      className="gap-2 sm:min-w-36"
                      onClick={() => openEditModal(drawerReservation)}
                    >
                      <PencilLine className="h-4 w-4" />
                      Tahrirlash
                    </Button>
                    <Button
                      variant="secondary"
                      className="gap-2 sm:min-w-44"
                      onClick={() => openExtendModal(drawerReservation)}
                    >
                      <TimerReset className="h-4 w-4" />
                      Uzaytirish
                    </Button>
                  </>
                ) : null}
                {drawerReservation.status === "scheduled" ? (
                  <>
                    <Button
                      variant="secondary"
                      className="gap-2 sm:min-w-44"
                      onClick={() => setConfirmState({ type: "convert", reservation: drawerReservation })}
                    >
                      <WandSparkles className="h-4 w-4" />
                      Seansga aylantirish
                    </Button>
                    <Button
                      variant="danger"
                      className="gap-2 sm:min-w-36"
                      onClick={() => setConfirmState({ type: "cancel", reservation: drawerReservation })}
                    >
                      <CircleX className="h-4 w-4" />
                      Bekor qilish
                    </Button>
                  </>
                ) : null}
                {drawerReservation.status === "arrived" ? (
                  <Button
                    variant="secondary"
                    className="gap-2 sm:min-w-44"
                    onClick={() => setConfirmState({ type: "complete", reservation: drawerReservation })}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Yakunlash
                  </Button>
                ) : null}
              </div>
            </div>
          ) : undefined
        }
      >
        {drawerReservation ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ModalStat
                label="Stol"
                value={drawerTable?.name ?? drawerReservation.tableId}
                hint={drawerTable?.type === "vip" ? "VIP" : "Oddiy"}
              />
              <ModalStat
                label="Vaqt oralig'i"
                value={`${formatClock(drawerReservation.startAt, settings.timezone)} - ${formatClock(drawerReservation.endAt, settings.timezone)}`}
                hint={resolvedSelectedDay}
              />
              <ModalStat
                label="Mehmonlar"
                value={`${drawerReservation.guests} kishi`}
                hint={drawerReservation.phone}
              />
              <ModalStat
                label="Status"
                value={reservationStatusCopy[drawerReservation.status].label}
                hint="Operatsion holat"
              />
            </div>

            <ModalNote
              tone={
                drawerReservation.status === "arrived"
                  ? "green"
                  : drawerReservation.status === "completed"
                    ? "slate"
                    : "amber"
              }
            >
              {drawerReservation.note
                ? drawerReservation.note
                : "Qo'shimcha izoh kiritilmagan. Bu drawer tezkor ko'rish va action-entry nuqtasi sifatida ishlaydi."}
            </ModalNote>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <div className="font-semibold text-white">Action summary</div>
              <div className="mt-2 text-sm text-slate-400">
                Timeline page-first qoldi. Tahrirlash, seansga aylantirish, bekor qilish va yakunlash esa shu drawer ichidan boshlanadi.
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Mijoz</div>
                  <div className="mt-2 font-semibold text-white">{drawerReservation.customerName}</div>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Telefon</div>
                  <div className="mt-2 font-semibold text-white">{drawerReservation.phone}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      <ResponsiveModal
        open={Boolean(extendReservation)}
        onClose={() => {
          setExtendReservation(null);
          setExtendMinutes("30");
        }}
        title="Bron vaqtini uzaytirish"
        description="Bronning yakun vaqtini tez kengaytiring. Tizim tanlangan stol bo'yicha overlap bo'lsa uzaytirishga ruxsat bermaydi."
        tone="amber"
        size="md"
        icon={<TimerReset className="h-5 w-5" />}
        closeGuard={{ when: extendMinutes !== "30" }}
        headerMeta={
          extendReservation ? (
            <>
              <div className="data-chip">{extendReservation.customerName}</div>
              <div className="data-chip">
                {formatClock(extendReservation.startAt, settings.timezone)} -{" "}
                {formatClock(extendReservation.endAt, settings.timezone)}
              </div>
            </>
          ) : undefined
        }
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="sm:min-w-36" onClick={requestTopLayerClose} disabled={pending}>
              Yopish
            </Button>
            <Button
              type="button"
              className="sm:min-w-44"
              disabled={pending}
              onClick={() => {
                if (!extendReservation) {
                  return;
                }

                runReservationAction(
                  async () => {
                    const minutes = Number(extendMinutes);
                    if (!Number.isInteger(minutes) || minutes <= 0) {
                      throw new Error("Uzaytirish daqiqasini kiriting");
                    }

                    await patchReservation(extendReservation.id, {
                      endAt: new Date(new Date(extendReservation.endAt).getTime() + minutes * 60_000).toISOString(),
                    });
                  },
                  "Bron vaqti muvaffaqiyatli uzaytirildi",
                  () => {
                    setExtendReservation(null);
                    setExtendMinutes("30");
                  },
                );
              }}
            >
              {pending ? "Uzaytirilmoqda..." : "Bronni uzaytirish"}
            </Button>
          </div>
        }
      >
        {extendReservation ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <ModalStat
                label="Stol"
                value={tables.find((table) => table.id === extendReservation.tableId)?.name ?? extendReservation.tableId}
                hint={extendReservation.status === "arrived" ? "Faol seans bilan bog'langan" : "Rejalashtirilgan bron"}
              />
              <ModalStat
                label="Joriy yakun"
                value={formatClock(extendReservation.endAt, settings.timezone)}
                hint={resolvedSelectedDay}
              />
              <ModalStat
                label="Mehmonlar"
                value={`${extendReservation.guests} kishi`}
                hint={extendReservation.phone}
              />
            </div>

            <div>
              <div className="mb-2 block text-sm text-slate-400">Tez presetlar</div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[15, 30, 60, 90].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={extendMinutes === String(value) ? "primary" : "secondary"}
                    onClick={() => setExtendMinutes(String(value))}
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
                      new Date(extendReservation.endAt).getTime() + Math.max(Number(extendMinutes) || 0, 0) * 60_000,
                    ).toISOString(),
                    settings.timezone,
                  )}
                />
              </div>
            </div>

            <ModalNote tone="amber">
              Shu stol bo&#39;yicha keyingi bron bilan to&#39;qnashuv aniqlansa, tizim uzaytirishni bekor qiladi.
            </ModalNote>
          </div>
        ) : null}
      </ResponsiveModal>

      <ResponsiveModal
        open={modalState !== null}
        onClose={closeReservationModal}
        title={modalState?.type === "edit" ? "Bronni tahrirlash" : "Yangi bron"}
        description={
          modalState?.type === "edit"
            ? "Tanlangan bronning vaqtini va mijoz ma'lumotlarini yangilang."
            : "Stol, vaqt oralig'i va mijoz ma'lumotlarini kiriting."
        }
        tone={modalState?.type === "edit" ? "amber" : "cyan"}
        size="md"
        icon={<CalendarClock className="h-5 w-5" />}
        closeGuard={{ when: isDirty }}
        headerMeta={
          <div className="data-chip">{resolvedSelectedDay}</div>
        }
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="sm:min-w-36" onClick={requestTopLayerClose} disabled={pending}>
              Yopish
            </Button>
            <Button form="reservation-form" type="submit" className="sm:min-w-44" disabled={pending}>
              {pending
                ? "Saqlanmoqda..."
                : modalState?.type === "edit"
                  ? "Bronni yangilash"
                  : "Bron yaratish"}
            </Button>
          </div>
        }
        >
        <form
          id="reservation-form"
          className="space-y-5"
          onSubmit={handleSubmit((values) =>
            startTransition(async () => {
              clearErrors();
              setNotice(null);

              if (new Date(values.endAt).getTime() <= new Date(values.startAt).getTime()) {
                setError("endAt", {
                  type: "validate",
                  message: "Bron yakun vaqti boshlanishdan keyin bo'lishi kerak",
                });
                return;
              }

              try {
                if (modalState?.type === "edit" && activeReservation) {
                  await patchReservation(activeReservation.id, {
                    customerName: values.customerName,
                    phone: values.phone,
                    guests: Number(values.guests),
                    startAt: fromLocalDateTime(values.startAt, settings.timezone),
                    endAt: fromLocalDateTime(values.endAt, settings.timezone),
                    note: values.note,
                  });
                  await refreshData();
                  closeReservationModal();
                  setNotice({ type: "success", text: "Bron muvaffaqiyatli yangilandi" });
                  return;
                }

                await postReservation(values);
                await refreshData();
                closeReservationModal();
                reset(getCreateDefaults(resolvedSelectedDay));
                setNotice({ type: "success", text: "Bron muvaffaqiyatli yaratildi" });
              } catch (error) {
                const message = error instanceof Error ? error.message : "Bron saqlanmadi";
                if (message.toLowerCase().includes("yakun vaqti")) {
                  setError("endAt", { type: "server", message });
                  return;
                }
                setNotice({ type: "error", text: message });
              }
            }),
          )}
        >
          {modalState?.type === "edit" && activeReservation ? (
            <ModalNote tone="amber">
              Joriy oqimda tahrirlash paytida stol almashmaydi. Vaqt, mijoz va izohni yangilash mumkin.
            </ModalNote>
          ) : null}

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Stol</label>
              <Select {...register("tableId", { required: true })} disabled={modalState?.type === "edit"}>
                <option value="">Stol tanlang</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </Select>
              {errors.tableId ? <div className="mt-2 text-sm text-rose-300">Stol tanlanishi kerak</div> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">Mehmonlar soni</label>
              <Input type="number" min="1" max="16" {...register("guests", { required: true, valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Mijoz</label>
              <Input {...register("customerName", { required: true })} placeholder="Mijoz ismi" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Telefon</label>
              <Input {...register("phone", { required: true })} placeholder="+998 90 000 00 00" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Boshlanish</label>
              <Input type="datetime-local" {...register("startAt", { required: true })} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Yakun</label>
              <Input type="datetime-local" {...register("endAt", { required: true })} />
              {errors.endAt ? <div className="mt-2 text-sm text-rose-300">{errors.endAt.message}</div> : null}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Izoh</label>
            <Textarea {...register("note")} placeholder="Qo'shimcha ma'lumot" />
          </div>
        </form>
      </ResponsiveModal>

      <ConfirmModal
        open={confirmState !== null}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) {
            return;
          }

          if (confirmState.type === "convert") {
            runReservationAction(
              () => patchReservation(confirmState.reservation.id, { convertToSession: true }),
              "Bron faol seansga aylantirildi",
              () => setConfirmState(null),
            );
            return;
          }

          if (confirmState.type === "cancel") {
            runReservationAction(
              () => patchReservation(confirmState.reservation.id, { status: "cancelled" }),
              "Bron bekor qilindi",
              () => setConfirmState(null),
            );
            return;
          }

          runReservationAction(
            () => patchReservation(confirmState.reservation.id, { status: "completed" }),
            "Bron yakunlangan deb belgilandi",
            () => setConfirmState(null),
          );
        }}
        title={
          confirmState?.type === "convert"
            ? "Bronni seansga aylantirish"
            : confirmState?.type === "cancel"
              ? "Bronni bekor qilish"
              : "Bronni yakunlash"
        }
        description={
          confirmState?.type === "convert"
            ? "Kelgan mijoz uchun faol seans ochiladi va bron holati avtomatik yangilanadi."
            : confirmState?.type === "cancel"
              ? "Bekor qilingan bron timeline va ro'yxatda arxivlangan holatga o'tadi."
              : "Bron yakunlangan deb belgilanadi va kunlik statistika qayta hisoblanadi."
        }
        confirmLabel={
          confirmState?.type === "convert"
            ? "Seansga aylantirish"
            : confirmState?.type === "cancel"
              ? "Bekor qilish"
              : "Yakunlash"
        }
        confirmVariant={confirmState?.type === "cancel" ? "danger" : "primary"}
        pending={pending}
        tone={confirmState?.type === "cancel" ? "amber" : confirmState?.type === "complete" ? "green" : "cyan"}
        stats={
          confirmReservation ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ModalStat
                label="Mijoz"
                value={confirmReservation.customerName}
                hint={`${formatClock(confirmReservation.startAt, settings.timezone)} - ${formatClock(confirmReservation.endAt, settings.timezone)}`}
              />
              <ModalStat
                label="Stol va mehmon"
                value={tables.find((table) => table.id === confirmReservation.tableId)?.name ?? confirmReservation.tableId}
                hint={`${confirmReservation.guests} kishi`}
              />
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
