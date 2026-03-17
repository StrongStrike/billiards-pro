"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Boxes, ArrowDownUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { patchJson } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { formatCurrency, formatDateTimeLabel } from "@/lib/utils";
import { MetricCard, SectionHeader } from "@/features/shared";

export function InventoryPage() {
  const queryClient = useQueryClient();
  const bootstrapQuery = useBootstrapQuery();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stockQuantity, setStockQuantity] = useState("1");
  const [stockReason, setStockReason] = useState("");
  const [stockType, setStockType] = useState<"in" | "out" | "correction">("in");

  async function patchInventory(body: Record<string, unknown>) {
    await patchJson<{ ok: true }>("/api/inventory", body);
  }

  if (bootstrapQuery.isPending || !bootstrapQuery.data) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }

  const { products, stockMovements, settings, categories, lowStockProducts } = bootstrapQuery.data;
  const activeSkus = products.filter((item) => item.isActive).length;
  const totalUnits = products.reduce((sum, item) => sum + item.stock, 0);
  const inventoryValue = products.reduce((sum, item) => sum + item.costPrice * item.stock, 0);
  const sortedProducts = [...products].sort((left, right) => {
    const leftLow = left.stock <= left.threshold ? 1 : 0;
    const rightLow = right.stock <= right.threshold ? 1 : 0;
    if (leftLow !== rightLow) {
      return rightLow - leftLow;
    }
    return left.name.localeCompare(right.name);
  });
  const resolvedSelectedProductId = selectedProductId ?? sortedProducts[0]?.id ?? null;
  const product = products.find((item) => item.id === resolvedSelectedProductId) ?? null;
  const categoryName = categories.find((item) => item.id === product?.categoryId)?.name;

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Ombor"
        title="Ombor va qoldiq nazorati"
        description="Narx, qoldiq va limitlarni boshqarish, kirim-chiqim jurnalini yuritish."
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><MetricCard label="Faol SKU" value={`${activeSkus}`} accent="cyan" hint="Sotuvga chiqarilgan mahsulotlar" /></StaggerItem>
        <StaggerItem><MetricCard label="Past qoldiq" value={`${lowStockProducts.length}`} accent="amber" hint="Threshold bo'yicha" /></StaggerItem>
        <StaggerItem><MetricCard label="Jami birlik" value={`${totalUnits}`} accent="green" hint="Hozirgi qoldiq" /></StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Inventar qiymati"
            value={formatCurrency(inventoryValue, settings.currency)}
            accent="slate"
            hint="Cost price bo'yicha"
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <Panel tone="slate" className="hud-frame">
          <div className="font-display text-2xl font-bold text-white">Mahsulotlar</div>
          <div className="mt-5 space-y-3">
            {sortedProducts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedProductId(item.id)}
                className={`w-full rounded-[22px] border p-4 text-left transition ${
                  item.id === resolvedSelectedProductId
                    ? "border-cyan-300/30 bg-cyan-300/10"
                    : "border-white/8 bg-white/[0.04] hover:border-white/16"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{item.name}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {categories.find((category) => category.id === item.categoryId)?.name ?? "Kategoriya"} |{" "}
                      {formatCurrency(item.price, settings.currency)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Min {item.threshold}</div>
                    <div className={`mt-1 text-xs ${item.stock <= item.threshold ? "text-amber-200" : "text-slate-500"}`}>
                      Qoldiq {item.stock}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          </Panel>
        </Reveal>

        <div className="space-y-5">
          {product ? (
            <Reveal>
              <Panel tone={product.stock <= product.threshold ? "amber" : "cyan"} className="hud-frame">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-2xl font-bold text-white">{product.name}</div>
                  <div className="mt-1 text-sm text-slate-400">
                    {categoryName ?? "Kategoriya"} | {product.unit} | {product.isActive ? "Faol" : "Nofaol"}
                  </div>
                </div>
                <Boxes className="h-5 w-5 text-cyan-200" />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Sotuv narxi</label>
                  <Input
                    type="number"
                    defaultValue={product.price}
                    onBlur={(event) =>
                      startTransition(async () => {
                        setFeedback(null);
                        try {
                          await patchInventory({
                            action: "product",
                            productId: product.id,
                            price: Number(event.target.value),
                          });
                          await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
                          setFeedback("Narx yangilandi");
                        } catch (error) {
                          setFeedback(error instanceof Error ? error.message : "Xatolik yuz berdi");
                        }
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Tannarx</label>
                  <Input
                    type="number"
                    defaultValue={product.costPrice}
                    onBlur={(event) =>
                      startTransition(async () => {
                        setFeedback(null);
                        try {
                          await patchInventory({
                            action: "product",
                            productId: product.id,
                            costPrice: Number(event.target.value),
                          });
                          await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
                          setFeedback("Tannarx yangilandi");
                        } catch (error) {
                          setFeedback(error instanceof Error ? error.message : "Xatolik yuz berdi");
                        }
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Limit</label>
                  <Input
                    type="number"
                    defaultValue={product.threshold}
                    onBlur={(event) =>
                      startTransition(async () => {
                        setFeedback(null);
                        try {
                          await patchInventory({
                            action: "product",
                            productId: product.id,
                            threshold: Number(event.target.value),
                          });
                          await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
                          setFeedback("Limit yangilandi");
                        } catch (error) {
                          setFeedback(error instanceof Error ? error.message : "Xatolik yuz berdi");
                        }
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Holat</label>
                  <Button
                    variant={product.isActive ? "secondary" : "ghost"}
                    className="w-full justify-center"
                    onClick={() =>
                      startTransition(async () => {
                        setFeedback(null);
                        try {
                          await patchInventory({
                            action: "product",
                            productId: product.id,
                            isActive: !product.isActive,
                          });
                          await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
                          setFeedback(product.isActive ? "Mahsulot vaqtincha o'chirildi" : "Mahsulot faollashtirildi");
                        } catch (error) {
                          setFeedback(error instanceof Error ? error.message : "Xatolik yuz berdi");
                        }
                      })
                    }
                  >
                    {product.isActive ? "Nofaol qilish" : "Faol qilish"}
                  </Button>
                </div>
              </div>

              <div className="hud-frame sheen-surface mt-6 rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white">Kirim / chiqim</div>
                  <ArrowDownUp className="h-5 w-5 text-amber-200" />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[120px_120px_1fr]">
                  <Select
                    value={stockType}
                    onChange={(event) => setStockType(event.target.value as "in" | "out" | "correction")}
                  >
                    <option value="in">Kirim</option>
                    <option value="out">Chiqim</option>
                    <option value="correction">Korreksiya</option>
                  </Select>
                  <Input
                    type="number"
                    value={stockQuantity}
                    onChange={(event) => setStockQuantity(event.target.value)}
                  />
                  <Input
                    value={stockReason}
                    onChange={(event) => setStockReason(event.target.value)}
                    placeholder="Sabab"
                  />
                </div>
                <Button
                  className="mt-4"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setFeedback(null);
                      try {
                        await patchInventory({
                          action: "stock",
                          productId: product.id,
                          type: stockType,
                          quantity: Number(stockQuantity),
                          reason: stockReason,
                        });
                        setStockReason("");
                        setStockQuantity("1");
                        await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
                        setFeedback("Ombor harakati saqlandi");
                      } catch (error) {
                        setFeedback(error instanceof Error ? error.message : "Xatolik yuz berdi");
                      }
                    })
                  }
                >
                  Harakatni saqlash
                </Button>
              </div>

              {feedback ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                  {feedback}
                </div>
              ) : null}
              </Panel>
            </Reveal>
          ) : null}

          <Reveal>
            <Panel tone="green" className="hud-frame">
            <div className="font-display text-2xl font-bold text-white">Oxirgi ombor harakatlari</div>
            <div className="mt-5 space-y-3">
              {stockMovements.slice(0, 8).map((movement) => {
                const movementProduct = products.find((item) => item.id === movement.productId);
                return (
                  <div key={movement.id} className="sheen-surface rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-white">{movementProduct?.name ?? movement.productId}</div>
                        <div className="mt-1 text-sm text-slate-400">{movement.reason}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDateTimeLabel(movement.createdAt, settings.timezone)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-display text-2xl font-bold ${
                            movement.type === "out"
                              ? "text-rose-200"
                              : movement.type === "in"
                                ? "text-emerald-200"
                                : "text-cyan-200"
                          }`}
                        >
                          {movement.type === "out" ? "-" : "+"}
                          {movement.quantity}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                          Qoldiq {movement.resultingStock}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </Panel>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
