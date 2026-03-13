"use client";

import { useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ReceiptText, ShoppingBasket, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { postJson } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { formatCurrency, formatDateTimeLabel } from "@/lib/utils";
import { EmptyState, SectionHeader } from "@/features/shared";

type CartItem = { productId: string; quantity: number };

export function OrdersPage() {
  const queryClient = useQueryClient();
  const bootstrapQuery = useBootstrapQuery();
  const [mode, setMode] = useState<"table" | "counter">("table");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeTables = useMemo(
    () => bootstrapQuery.data?.tables.filter((table) => table.activeSession) ?? [],
    [bootstrapQuery.data],
  );

  const cartTotal = useMemo(() => {
    if (!bootstrapQuery.data) {
      return 0;
    }
    return cart.reduce((sum, item) => {
      const product = bootstrapQuery.data?.products.find((candidate) => candidate.id === item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0);
  }, [bootstrapQuery.data, cart]);

  async function submitOrder() {
    if (!bootstrapQuery.data || cart.length === 0) {
      throw new Error("Savat bo'sh");
    }

    const route = mode === "table" ? "/api/orders" : "/api/counter-sales";
    const payload =
      mode === "table"
        ? { tableId: selectedTableId, items: cart }
        : { customerName, items: cart };

    await postJson<{ ok: true }>(route, payload);
    setCart([]);
    setCustomerName("");
    await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  }

  if (bootstrapQuery.isPending || !bootstrapQuery.data) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }

  const { categories, products, settings, orders, counterSales } = bootstrapQuery.data;

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Buyurtmalar"
        title="Bar va kassadagi savdo"
        description="Mahsulotlarni faol stolga biriktirish yoki alohida kassa savdosi sifatida o'tkazish."
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={mode === "table" ? "primary" : "secondary"}
              onClick={() => setMode("table")}
              className="gap-2"
            >
              <Table2 className="h-4 w-4" />
              Stolga biriktirish
            </Button>
            <Button
              variant={mode === "counter" ? "primary" : "secondary"}
              onClick={() => setMode("counter")}
              className="gap-2"
            >
              <ReceiptText className="h-4 w-4" />
              Kassa savdosi
            </Button>
          </div>

          <div className="mt-5 grid gap-4">
            {mode === "table" ? (
              <div>
                <label className="mb-2 block text-sm text-slate-400">Faol stol</label>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                  value={selectedTableId}
                  onChange={(event) => setSelectedTableId(event.target.value)}
                >
                  <option value="">Stol tanlang</option>
                  {activeTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name} - {table.activeSession?.customerName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm text-slate-400">Mijoz nomi</label>
                <Input
                  placeholder="Ixtiyoriy"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </div>
            )}
          </div>

          <div className="mt-6 space-y-5">
            {categories.map((category) => (
              <div key={category.id}>
                <div className="font-display text-2xl font-bold text-white">{category.name}</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {products
                    .filter((product) => product.categoryId === category.id && product.isActive)
                    .map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setCart((current) => {
                            const existing = current.find((item) => item.productId === product.id);
                            if (existing) {
                              return current.map((item) =>
                                item.productId === product.id
                                  ? { ...item, quantity: item.quantity + 1 }
                                  : item,
                              );
                            }
                            return [...current, { productId: product.id, quantity: 1 }];
                          });
                        }}
                        className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
                      >
                        <div className="font-semibold text-white">{product.name}</div>
                        <div className="mt-2 text-sm text-slate-400">
                          {product.unit} | Qoldiq {product.stock}
                        </div>
                        <div className="mt-4 font-display text-2xl font-bold text-cyan-200">
                          {formatCurrency(product.price, settings.currency)}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <div className="flex items-center justify-between">
              <div className="font-display text-2xl font-bold text-white">Savat</div>
              <ShoppingBasket className="h-5 w-5 text-cyan-200" />
            </div>

            {cart.length === 0 ? (
              <div className="mt-5 text-sm text-slate-500">Mahsulot qo&#39;shilmagan.</div>
            ) : (
              <div className="mt-5 space-y-3">
                {cart.map((item) => {
                  const product = products.find((candidate) => candidate.id === item.productId);
                  if (!product) {
                    return null;
                  }
                  return (
                    <div
                      key={item.productId}
                      className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">{product.name}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {formatCurrency(product.price, settings.currency)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            className="h-10 w-10 rounded-full px-0"
                            onClick={() =>
                              setCart((current) =>
                                current
                                  .map((entry) =>
                                    entry.productId === item.productId
                                      ? { ...entry, quantity: Math.max(1, entry.quantity - 1) }
                                      : entry,
                                  )
                                  .filter((entry) => entry.quantity > 0),
                              )
                            }
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-semibold text-white">{item.quantity}</span>
                          <Button
                            variant="secondary"
                            className="h-10 w-10 rounded-full px-0"
                            onClick={() =>
                              setCart((current) =>
                                current.map((entry) =>
                                  entry.productId === item.productId
                                    ? { ...entry, quantity: entry.quantity + 1 }
                                    : entry,
                                ),
                              )
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 rounded-[24px] border border-cyan-300/20 bg-cyan-300/10 p-4">
              <div className="text-sm text-cyan-100">Jami summa</div>
              <div className="mt-2 font-display text-3xl font-bold text-white">
                {formatCurrency(cartTotal, settings.currency)}
              </div>
            </div>

            {feedback ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                {feedback}
              </div>
            ) : null}

            <Button
              className="mt-5 w-full justify-center"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    setFeedback(null);
                    if (mode === "table" && !selectedTableId) {
                      throw new Error("Faol stolni tanlang");
                    }
                    await submitOrder();
                    setFeedback("Buyurtma muvaffaqiyatli saqlandi");
                  } catch (error) {
                    setFeedback(error instanceof Error ? error.message : "Xatolik yuz berdi");
                  }
                })
              }
            >
              {pending ? "Saqlanmoqda..." : mode === "table" ? "Stolga biriktirish" : "Kassa savdosini yaratish"}
            </Button>
          </Panel>

          <Panel>
            <div className="font-display text-2xl font-bold text-white">So&#39;nggi savdolar</div>
            {counterSales.length === 0 && orders.length === 0 ? (
              <EmptyState
                title="Savdo hali yo'q"
                description="Biror buyurtma o'tkazilgach shu yerda ko'rinadi."
              />
            ) : (
              <div className="mt-5 space-y-3">
                {counterSales.slice(0, 4).map((sale) => (
                  <div key={sale.id} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{sale.customerName ?? "Kassa mijozi"}</div>
                        <div className="mt-1 text-sm text-slate-400">
                          {formatDateTimeLabel(sale.createdAt, settings.timezone)}
                        </div>
                      </div>
                      <div className="font-display text-2xl font-bold text-emerald-200">
                        {formatCurrency(sale.total, settings.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
