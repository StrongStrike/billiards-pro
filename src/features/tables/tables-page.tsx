"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock3, CupSoda, Play, Square, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { postJson } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { formatClock, formatCurrency, formatDuration } from "@/lib/utils";
import { SectionHeader, TableCard } from "@/features/shared";

export function TablesPage() {
  const queryClient = useQueryClient();
  const bootstrapQuery = useBootstrapQuery();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [startCustomer, setStartCustomer] = useState("");
  const [startNote, setStartNote] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function refreshData() {
    await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  }

  function runAction(task: () => Promise<void>) {
    startTransition(async () => {
      try {
        setFeedback(null);
        await task();
        await refreshData();
        setFeedback("Amal muvaffaqiyatli bajarildi");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Xatolik yuz berdi");
      }
    });
  }

  if (bootstrapQuery.isPending || !bootstrapQuery.data) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }

  const { tables, products, settings, orders, orderItems } = bootstrapQuery.data;
  const resolvedSelectedTableId = selectedTableId ?? tables[0]?.id ?? null;
  const selectedTable = tables.find((table) => table.id === resolvedSelectedTableId) ?? null;
  const selectedSessionOrderItems =
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
      : [];

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Stollar"
        title="Stollarni jonli boshqarish"
        description="Har bir stol uchun start/stop, jonli billing va tezkor bar buyurtmasi."
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {tables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                currency={settings.currency}
                timezone={settings.timezone}
                compact
                selected={table.id === resolvedSelectedTableId}
                onSelect={() => setSelectedTableId(table.id)}
              />
            ))}
          </div>
        </Panel>

        <Panel>
          {selectedTable ? (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-cyan-300/75">Operatsion konsol</div>
                  <div className="mt-3 font-display text-3xl font-bold text-white">{selectedTable.name}</div>
                  <div className="mt-2 text-sm text-slate-400">
                    {selectedTable.type === "vip" ? "VIP tarif" : "Oddiy tarif"} |{" "}
                    {formatCurrency(selectedTable.hourlyRate, settings.currency)}
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  {selectedTable.status === "active" ? "Band" : selectedTable.status === "reserved" ? "Bron" : "Bo'sh"}
                </div>
              </div>

              {selectedTable.activeSession ? (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
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
                        Joriy chek
                      </div>
                      <div className="mt-4 font-display text-3xl font-bold text-white">
                        {formatCurrency(selectedTable.currentSummary?.total ?? 0, settings.currency)}
                      </div>
                      <div className="mt-2 text-sm text-slate-400">{selectedTable.activeSession.customerName}</div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="font-semibold text-white">Bar buyurtma qo&#39;shish</div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_110px]">
                      <select
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                        value={productId}
                        onChange={(event) => setProductId(event.target.value)}
                      >
                        <option value="">Mahsulot tanlang</option>
                        {products.filter((product) => product.isActive).map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.price, settings.currency)}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                      />
                    </div>
                    <div className="mt-3">
                      <Button
                        className="gap-2"
                        onClick={() =>
                          runAction(async () => {
                            if (!productId) {
                              throw new Error("Mahsulotni tanlang");
                            }
                            await postJson("/api/orders", {
                              sessionId: selectedTable.activeSession?.id,
                              tableId: selectedTable.id,
                              items: [{ productId, quantity: Number(quantity) }],
                            });
                            setProductId("");
                            setQuantity("1");
                          })
                        }
                        disabled={pending}
                      >
                        <CupSoda className="h-4 w-4" />
                        Buyurtma qo&#39;shish
                      </Button>
                    </div>
                    <div className="mt-5 space-y-2">
                      {selectedSessionOrderItems.length === 0 ? (
                        <div className="text-sm text-slate-500">Hozircha buyurtma yo&#39;q.</div>
                      ) : (
                        selectedSessionOrderItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm"
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

                  <Button
                    variant="danger"
                    className="w-full justify-center gap-2"
                    onClick={() =>
                      runAction(async () => {
                        await postJson(`/api/tables/${selectedTable.id}/session/stop`, {});
                      })
                    }
                    disabled={pending}
                  >
                    <Square className="h-4 w-4" />
                    Seansni yakunlash
                  </Button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {selectedTable.nextReservation ? (
                    <div className="rounded-[22px] border border-amber-300/20 bg-amber-400/8 p-4 text-sm text-amber-100">
                      Keyingi bron: {selectedTable.nextReservation.customerName} |{" "}
                      {formatClock(selectedTable.nextReservation.startAt, settings.timezone)} -{" "}
                      {formatClock(selectedTable.nextReservation.endAt, settings.timezone)}
                    </div>
                  ) : null}
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Mijoz ismi</label>
                    <Input
                      placeholder="Mijoz ismini kiriting"
                      value={startCustomer}
                      onChange={(event) => setStartCustomer(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">Izoh</label>
                    <Input
                      placeholder="Masalan: turnir o&#39;yini"
                      value={startNote}
                      onChange={(event) => setStartNote(event.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full justify-center gap-2"
                    onClick={() =>
                      runAction(async () => {
                        if (!startCustomer.trim()) {
                          throw new Error("Mijoz ismini kiriting");
                        }
                        await postJson(`/api/tables/${selectedTable.id}/session/start`, {
                          customerName: startCustomer,
                          note: startNote,
                        });
                        setStartCustomer("");
                        setStartNote("");
                      })
                    }
                    disabled={pending}
                  >
                    <Play className="h-4 w-4" />
                    Seansni boshlash
                  </Button>
                </div>
              )}

              {feedback ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                  {feedback}
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
