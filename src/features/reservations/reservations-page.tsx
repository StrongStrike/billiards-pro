"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock, CheckCircle2, CircleX, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { patchJson, postJson } from "@/lib/client/api";
import { reservationStatusCopy } from "@/lib/constants";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { fromLocalDateTime } from "@/lib/time";
import { formatClock, formatDateTimeLabel } from "@/lib/utils";
import { EmptyState, MetricCard, SectionHeader } from "@/features/shared";

type ReservationFormValues = {
  tableId: string;
  customerName: string;
  phone: string;
  guests: number;
  startAt: string;
  endAt: string;
  note?: string;
};

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

export function ReservationsPage() {
  const bootstrapQuery = useBootstrapQuery();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedDay, setSelectedDay] = useState("");
  const timezone = bootstrapQuery.data?.settings.timezone ?? "Asia/Tashkent";
  const resolvedSelectedDay = selectedDay || formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<ReservationFormValues>();

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

  function runReservationAction(task: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      setNotice(null);
      try {
        await task();
        await refreshData();
        setNotice({ type: "success", text: successMessage });
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
        description="Ichki paneldan bron yaratish, kunlik timeline bo&#39;yicha ko&#39;rish va kelgan mijozni seansga aylantirish."
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><MetricCard label="Tanlangan kun" value={`${dayReservations.length}`} accent="amber" hint="Jami bronlar" /></StaggerItem>
        <StaggerItem><MetricCard label="Rejalashtirilgan" value={`${dayScheduled}`} accent="cyan" hint="Kelishi kutilmoqda" /></StaggerItem>
        <StaggerItem><MetricCard label="Kelganlar" value={`${dayArrived}`} accent="green" hint="Faol seans bilan" /></StaggerItem>
        <StaggerItem><MetricCard label="Mehmonlar" value={`${dayGuests}`} accent="slate" hint={`Yakunlangan: ${dayCompleted}`} /></StaggerItem>
      </Stagger>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Reveal>
          <Panel tone="cyan" className="hud-frame self-start xl:sticky xl:top-4">
          <div className="flex items-center justify-between">
            <div className="font-display text-2xl font-bold text-white">Yangi bron</div>
            <CalendarClock className="h-5 w-5 text-cyan-200" />
          </div>
          <div className="mt-3 text-sm leading-7 text-slate-400">
            Operator bir necha soniyada stol, vaqt oralig&#39;i va mijozni biriktirib yangi bron ochadi.
          </div>
          <form
            className="mt-6 space-y-4"
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
                  await postReservation(values);
                  await refreshData();
                  reset();
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
            <div>
              <label className="mb-2 block text-sm text-slate-400">Stol</label>
              <Select {...register("tableId", { required: true })}>
                <option value="">Stol tanlang</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </Select>
              {errors.tableId ? <div className="mt-2 text-sm text-rose-300">Stol tanlanishi kerak</div> : null}
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
              <label className="mb-2 block text-sm text-slate-400">Mehmonlar soni</label>
              <Input type="number" min="1" max="16" {...register("guests", { required: true, valueAsNumber: true })} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Izoh</label>
              <Textarea {...register("note")} placeholder="Qo'shimcha ma'lumot" />
            </div>
            <Button type="submit" className="w-full justify-center" disabled={pending}>
              {pending ? "Saqlanmoqda..." : "Bron yaratish"}
            </Button>
            {notice ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  notice.type === "error"
                    ? "border-rose-300/20 bg-rose-500/10 text-rose-200"
                    : "border-emerald-300/20 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {notice.text}
              </div>
            ) : null}
          </form>
          </Panel>
        </Reveal>

        <div className="min-w-0 space-y-5">
          <Reveal>
            <Panel tone="amber" className="hud-frame min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-display text-2xl font-bold text-white">Kunlik timeline</div>
                <div className="mt-2 text-sm text-slate-400">
                  30 daqiqalik slotlar bo&#39;yicha barcha stollar kesimi.
                </div>
              </div>
              <div className="w-full max-w-52">
                <Input
                  type="date"
                  className="max-w-52"
                  value={resolvedSelectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                />
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
                              <div
                                key={reservation.id}
                                className={`pointer-events-auto m-1 flex flex-col justify-center rounded-xl border border-white/10 px-3 text-xs text-white shadow-[0_10px_20px_rgba(0,0,0,0.18)] ${accent}`}
                                style={{ gridColumn: `${startSlot} / ${Math.max(endSlot, startSlot + 1)}` }}
                              >
                                <div className="truncate font-semibold">{reservation.customerName}</div>
                                <div className="truncate text-[11px] text-slate-200">
                                  {formatDateTimeLabel(reservation.startAt, settings.timezone)} -{" "}
                                  {formatDateTimeLabel(reservation.endAt, settings.timezone)}
                                </div>
                              </div>
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
                  description="Timeline yuqorisidan boshqa kunni tanlang yoki yangi bron yarating."
                />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {dayReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="sheen-surface rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.025))] p-5"
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
                          {reservation.tableId.replace("table-", "Stol ")} | {formatClock(reservation.startAt, settings.timezone)} -{" "}
                          {formatClock(reservation.endAt, settings.timezone)} | {reservation.guests} kishi
                        </div>
                        <div className="mt-2 text-sm text-slate-500">{reservation.phone}</div>
                        {reservation.note ? <div className="mt-2 text-sm text-slate-400">{reservation.note}</div> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {reservation.status === "scheduled" ? (
                          <>
                            <Button
                              variant="secondary"
                              className="gap-2"
                              onClick={() =>
                                runReservationAction(
                                  () => patchReservation(reservation.id, { convertToSession: true }),
                                  "Bron faol seansga aylantirildi",
                                )
                              }
                            >
                              <WandSparkles className="h-4 w-4" />
                              Seansga aylantirish
                            </Button>
                            <Button
                              variant="danger"
                              className="gap-2"
                              onClick={() =>
                                runReservationAction(
                                  () => patchReservation(reservation.id, { status: "cancelled" }),
                                  "Bron bekor qilindi",
                                )
                              }
                            >
                              <CircleX className="h-4 w-4" />
                              Bekor qilish
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            className="gap-2"
                            onClick={() =>
                              runReservationAction(
                                () => patchReservation(reservation.id, { status: "completed" }),
                                "Bron yakunlangan deb belgilandi",
                              )
                            }
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Yakunlangan deb belgilash
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </Panel>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
