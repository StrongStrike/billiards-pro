"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ReceiptText, ShoppingBasket, Table2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { postJson } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { formatCurrency, formatDateTimeLabel } from "@/lib/utils";
import { EmptyState, MetricCard, SectionHeader } from "@/features/shared";

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
  const activeProductsCount = bootstrapQuery.data?.products.filter((product) => product.isActive).length ?? 0;
  const lowStockCount = bootstrapQuery.data?.lowStockProducts.length ?? 0;
  const counterRevenueToday = bootstrapQuery.data?.counterSales.reduce((sum, sale) => sum + sale.total, 0) ?? 0;

  useEffect(() => {
    if (mode === "table" && !selectedTableId && activeTables[0]) {
      setSelectedTableId(activeTables[0].id);
    }
  }, [activeTables, mode, selectedTableId]);

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

  const { categories, products, settings, orders, counterSales, lowStockProducts } = bootstrapQuery.data;

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Buyurtmalar"
        title="Bar va kassadagi savdo"
        description="Mahsulotlarni faol stolga biriktirish yoki alohida kassa savdosi sifatida o'tkazish."
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><MetricCard label="Faol stollar" value={`${activeTables.length}`} accent="green" hint="Buyurtmaga tayyor" /></StaggerItem>
        <StaggerItem><MetricCard label="Faol mahsulotlar" value={`${activeProductsCount}`} accent="cyan" hint="Sotuv katalogida" /></StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Kassa tushumi"
            value={formatCurrency(counterRevenueToday, settings.currency)}
            accent="amber"
            hint="Alohida counter savdolari"
          />
        </StaggerItem>
        <StaggerItem><MetricCard label="Past qoldiq" value={`${lowStockCount}`} accent="slate" hint="Diqqat talab qiladi" /></StaggerItem>
      </Stagger>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <Panel tone="cyan" className="hud-frame">
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
                <Select
                  value={selectedTableId}
                  onChange={(event) => setSelectedTableId(event.target.value)}
                >
                  <option value="">Stol tanlang</option>
                  {activeTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name} - {table.activeSession?.customerName}
                    </option>
                  ))}
                </Select>
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
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="font-display text-2xl font-bold text-white">{category.name}</div>
                    {category.description ? <div className="mt-1 text-sm text-slate-400">{category.description}</div> : null}
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {products.filter((product) => product.categoryId === category.id && product.isActive).length} item
                  </div>
                </div>
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
                        className="sheen-surface rounded-[24px] border border-white/8 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white">{product.name}</div>
                            <div className="mt-2 text-sm text-slate-400">
                              {product.unit} | Qoldiq {product.stock}
                            </div>
                          </div>
                          {product.stock <= product.threshold ? (
                            <div className="rounded-full border border-amber-300/18 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-amber-200">
                              Limit
                            </div>
                          ) : null}
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
        </Reveal>

        <div className="space-y-5">
          <Reveal>
            <Panel tone="green" className="hud-frame">
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
                      className="sheen-surface rounded-[22px] border border-white/8 bg-white/[0.04] p-4"
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
                                      ? { ...entry, quantity: entry.quantity - 1 }
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
                      <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-4 text-sm">
                        <span className="text-slate-400">{item.quantity} x birlik narx</span>
                        <span className="font-semibold text-white">
                          {formatCurrency(product.price * item.quantity, settings.currency)}
                        </span>
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
              size="lg"
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
          </Reveal>

          <Reveal>
            <Panel tone="amber" className="hud-frame">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-2xl font-bold text-white">So&#39;nggi savdolar</div>
              {lowStockProducts.length > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/18 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-amber-200">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  {lowStockProducts.length} ta mahsulot past qoldiqda
                </div>
              ) : null}
            </div>
            {counterSales.length === 0 && orders.length === 0 ? (
              <EmptyState
                title="Savdo hali yo'q"
                description="Biror buyurtma o'tkazilgach shu yerda ko'rinadi."
              />
            ) : (
              <div className="mt-5 space-y-3">
                {counterSales.slice(0, 4).map((sale) => (
                  <div key={sale.id} className="sheen-surface rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
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
          </Reveal>
        </div>
      </div>
    </div>
  );
}
