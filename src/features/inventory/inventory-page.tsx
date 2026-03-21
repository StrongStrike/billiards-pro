"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Boxes, PencilLine, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModalDismiss } from "@/components/ui/modal-provider";
import { Panel } from "@/components/ui/panel";
import { ModalNote, ModalStat, ResponsiveModal } from "@/components/ui/responsive-modal";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { patchJson } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { cn, formatCurrency, formatDateTimeLabel } from "@/lib/utils";
import { MetricCard, SectionHeader } from "@/features/shared";

type InventoryModal = "product" | "stock" | null;

export function InventoryPage() {
  const queryClient = useQueryClient();
  const bootstrapQuery = useBootstrapQuery();
  const requestTopLayerClose = useModalDismiss();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<InventoryModal>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stockQuantity, setStockQuantity] = useState("1");
  const [stockReason, setStockReason] = useState("");
  const [stockType, setStockType] = useState<"in" | "out" | "correction">("in");
  const [productPrice, setProductPrice] = useState("");
  const [productCostPrice, setProductCostPrice] = useState("");
  const [productThreshold, setProductThreshold] = useState("");

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
  const productMovements = product ? stockMovements.filter((movement) => movement.productId === product.id).slice(0, 5) : [];
  const productDirty = product
    ? Number(productPrice || 0) !== product.price ||
      Number(productCostPrice || 0) !== product.costPrice ||
      Number(productThreshold || 0) !== product.threshold
    : false;
  const stockDirty = Number(stockQuantity || 0) > 0 || stockReason.trim() !== "" || stockType !== "in";

  function closeModal() {
    setActiveModal(null);
  }

  function openProductModal() {
    if (!product) {
      return;
    }
    setProductPrice(String(product.price));
    setProductCostPrice(String(product.costPrice));
    setProductThreshold(String(product.threshold));
    setActiveModal("product");
  }

  function openStockModal() {
    setStockQuantity("1");
    setStockReason("");
    setStockType("in");
    setActiveModal("stock");
  }

  function runAction(task: () => Promise<void>, successMessage: string, onSuccess?: () => void) {
    startTransition(async () => {
      setFeedback(null);
      try {
        await task();
        await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
        setFeedback(successMessage);
        onSuccess?.();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Xatolik yuz berdi");
      }
    });
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Ombor"
        title="Ombor va qoldiq nazorati"
        description="Ro'yxat page-first qoladi, mahsulot tahriri va kirim-chiqim esa alohida premium modal workflow orqali boshqariladi."
        action={
          product ? (
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" onClick={openProductModal}>
                <PencilLine className="h-4 w-4" />
                Mahsulotni tahrirlash
              </Button>
              <Button variant="secondary" className="gap-2" onClick={openStockModal}>
                <ArrowDownUp className="h-4 w-4" />
                Kirim / chiqim
              </Button>
            </div>
          ) : undefined
        }
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

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
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

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ModalStat label="Sotuv narxi" value={formatCurrency(product.price, settings.currency)} hint="Retail price" />
                  <ModalStat label="Tannarx" value={formatCurrency(product.costPrice, settings.currency)} hint="Cost basis" />
                  <ModalStat label="Qoldiq" value={`${product.stock}`} hint={`Threshold ${product.threshold}`} />
                  <ModalStat label="Holat" value={product.isActive ? "Faol" : "Nofaol"} hint={categoryName ?? "Kategoriya"} />
                </div>

                <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-white">Inventory action layer</div>
                      <div className="mt-2 text-sm text-slate-400">
                        Narx, tannarx, limit va qoldiq endi sahifada tasodifiy onBlur bilan emas, aniq modal workflow bilan yangilanadi.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button className="gap-2" onClick={openProductModal}>
                        <PencilLine className="h-4 w-4" />
                        Tahrirlash
                      </Button>
                      <Button variant="secondary" className="gap-2" onClick={openStockModal}>
                        <ArrowDownUp className="h-4 w-4" />
                        Harakat kiritish
                      </Button>
                    </div>
                  </div>
                </div>

                {feedback ? (
                  <div className={cn(
                    "mt-4 rounded-[22px] border px-4 py-3 text-sm",
                    feedback.toLowerCase().includes("xato") || feedback.toLowerCase().includes("qoldiq") || feedback.toLowerCase().includes("miqdor")
                      ? "border-rose-300/20 bg-rose-500/10 text-rose-100"
                      : "border-emerald-300/18 bg-emerald-400/10 text-emerald-100",
                  )}>
                    {feedback}
                  </div>
                ) : null}
              </Panel>
            </Reveal>
          ) : null}

          <Reveal>
            <Panel tone="green" className="hud-frame">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-2xl font-bold text-white">Oxirgi ombor harakatlari</div>
                {product ? (
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {product.name}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 space-y-3">
                {productMovements.length === 0 ? (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm text-slate-500">
                    Tanlangan mahsulot bo&#39;yicha harakat hali yo&#39;q.
                  </div>
                ) : (
                  productMovements.map((movement) => (
                    <div key={movement.id} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white">{movement.reason}</div>
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
                            {movement.type === "out" ? "-" : movement.type === "correction" && movement.quantity < 0 ? "" : "+"}
                            {movement.quantity}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            Qoldiq {movement.resultingStock}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </Reveal>

          {lowStockProducts.length > 0 ? (
            <Reveal>
              <Panel tone="amber" className="hud-frame">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-display text-2xl font-bold text-white">Kritik qoldiq</div>
                  <TriangleAlert className="h-5 w-5 text-amber-200" />
                </div>
                <div className="mt-5 space-y-3">
                  {lowStockProducts.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-amber-300/16 bg-amber-400/8 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="mt-1 text-sm text-amber-100/80">
                            Min {item.threshold} | Hozir {item.stock}
                          </div>
                        </div>
                        <Button variant="secondary" className="gap-2" onClick={() => {
                          setSelectedProductId(item.id);
                          openStockModal();
                        }}>
                          <ArrowDownUp className="h-4 w-4" />
                          To&#39;ldirish
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </Reveal>
          ) : null}
        </div>
      </div>

      {product ? (
        <>
          <ResponsiveModal
            open={activeModal === "product"}
            onClose={closeModal}
            title={`${product.name} sozlamalari`}
            description="Narx, tannarx, limit va aktiv holatni bitta professional modal ichida boshqaring."
            tone={product.stock <= product.threshold ? "amber" : "cyan"}
            icon={<PencilLine className="h-5 w-5" />}
            closeGuard={{ when: productDirty }}
            hotkeys={[
              {
                key: "s",
                ctrlOrMeta: true,
                allowInInput: true,
                label: "Mahsulot sozlamalarini saqlash",
                action: () =>
                  runAction(
                    () =>
                      patchInventory({
                        action: "product",
                        productId: product.id,
                        price: Number(productPrice),
                        costPrice: Number(productCostPrice),
                        threshold: Number(productThreshold),
                      }),
                    "Mahsulot sozlamalari yangilandi",
                    closeModal,
                  ),
              },
            ]}
            headerMeta={
              <>
                <div className="data-chip">{categoryName ?? "Kategoriya"}</div>
                <div className="data-chip">{product.isActive ? "Faol" : "Nofaol"}</div>
              </>
            }
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <Button variant="secondary" onClick={requestTopLayerClose} disabled={pending}>
                    Yopish
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      runAction(
                        () =>
                          patchInventory({
                            action: "product",
                            productId: product.id,
                            isActive: !product.isActive,
                          }),
                        product.isActive ? "Mahsulot vaqtincha o'chirildi" : "Mahsulot faollashtirildi",
                        closeModal,
                      )
                    }
                  >
                    {product.isActive ? "Nofaol qilish" : "Faol qilish"}
                  </Button>
                </div>
                <Button
                  disabled={pending}
                  onClick={() =>
                    runAction(
                      () =>
                        patchInventory({
                          action: "product",
                          productId: product.id,
                          price: Number(productPrice),
                          costPrice: Number(productCostPrice),
                          threshold: Number(productThreshold),
                        }),
                      "Mahsulot sozlamalari yangilandi",
                      closeModal,
                    )
                  }
                >
                  {pending ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            }
          >
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <ModalStat label="Qoldiq" value={`${product.stock}`} hint={`Threshold ${product.threshold}`} />
                <ModalStat label="Sotuv narxi" value={formatCurrency(product.price, settings.currency)} hint="Current retail" />
                <ModalStat label="Tannarx" value={formatCurrency(product.costPrice, settings.currency)} hint="Current cost" />
              </div>

              <ModalNote tone={product.stock <= product.threshold ? "amber" : "cyan"}>
                Bu yerda onBlur save yo&#39;q. Operator barcha o&#39;zgarishlarni ko&#39;rib chiqib, keyin aniq tasdiqlaydi.
              </ModalNote>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Sotuv narxi</label>
                  <Input type="number" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Tannarx</label>
                  <Input type="number" value={productCostPrice} onChange={(event) => setProductCostPrice(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Limit</label>
                  <Input type="number" value={productThreshold} onChange={(event) => setProductThreshold(event.target.value)} />
                </div>
              </div>
            </div>
          </ResponsiveModal>

          <ResponsiveModal
            open={activeModal === "stock"}
            onClose={closeModal}
            title={`${product.name} uchun ombor harakati`}
            description="Kirim, chiqim yoki korreksiya sababi bilan qoldiqni boshqaring. Har bir o'zgarish jurnalga yoziladi."
            tone="green"
            icon={<ArrowDownUp className="h-5 w-5" />}
            closeGuard={{ when: stockDirty }}
            hotkeys={[
              {
                key: "s",
                ctrlOrMeta: true,
                allowInInput: true,
                label: "Ombor harakatini saqlash",
                action: () =>
                  runAction(
                    () =>
                      patchInventory({
                        action: "stock",
                        productId: product.id,
                        type: stockType,
                        quantity: Number(stockQuantity),
                        reason: stockReason,
                      }),
                    "Ombor harakati saqlandi",
                    closeModal,
                  ),
              },
            ]}
            headerMeta={
              <>
                <div className="data-chip">{product.unit}</div>
                <div className="data-chip">Qoldiq {product.stock}</div>
              </>
            }
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={requestTopLayerClose} disabled={pending}>
                  Yopish
                </Button>
                <Button
                  disabled={pending}
                  onClick={() =>
                    runAction(
                      () =>
                        patchInventory({
                          action: "stock",
                          productId: product.id,
                          type: stockType,
                          quantity: Number(stockQuantity),
                          reason: stockReason,
                        }),
                      "Ombor harakati saqlandi",
                      closeModal,
                    )
                  }
                >
                  {pending ? "Saqlanmoqda..." : "Harakatni saqlash"}
                </Button>
              </div>
            }
          >
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <ModalStat label="Joriy qoldiq" value={`${product.stock}`} hint={product.unit} />
                <ModalStat label="Holat" value={product.isActive ? "Faol" : "Nofaol"} hint={categoryName ?? "Kategoriya"} />
                <ModalStat label="Threshold" value={`${product.threshold}`} hint="Kritik limit" />
              </div>

              <ModalNote tone="green">
                Sabab ko&#39;rsatilmagan stock harakat professional audit uchun yaroqsiz. Shu sababli sabab maydoni majburiy.
              </ModalNote>

              <div className="grid gap-4 md:grid-cols-[160px_160px_1fr]">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Harakat turi</label>
                  <Select value={stockType} onChange={(event) => setStockType(event.target.value as "in" | "out" | "correction")}>
                    <option value="in">Kirim</option>
                    <option value="out">Chiqim</option>
                    <option value="correction">Korreksiya</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Miqdor</label>
                  <Input type="number" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Sabab</label>
                  <Input value={stockReason} onChange={(event) => setStockReason(event.target.value)} placeholder="Masalan: yetkazib beruvchi, porcha, korreksiya" />
                </div>
              </div>
            </div>
          </ResponsiveModal>
        </>
      ) : null}
    </div>
  );
}
