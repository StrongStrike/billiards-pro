"use client";

import { memo, useCallback, useMemo, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  PackageSearch,
  Printer,
  ReceiptText,
  ShoppingBasket,
  ShoppingCart,
  Table2,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import { ReceiptPreview } from "@/components/print/receipt-preview";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { ModalDismissButton, useToast } from "@/components/ui/modal-provider";
import { ModalNote, ModalStat, ResponsiveModal } from "@/components/ui/responsive-modal";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { WizardModal } from "@/components/ui/wizard-modal";
import { postJson } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { openPrintDocument } from "@/lib/print";
import {
  buildReceiptHtml,
  createDocumentCode,
  type PrintableReceipt,
  type PrintableReceiptLine,
} from "@/lib/receipts";
import { formatCurrency, formatDateTimeLabel } from "@/lib/utils";
import { EmptyState, MetricCard, SectionHeader } from "@/features/shared";
import type { CounterSale, OrderItem, Product, ProductCategory, TableSnapshot } from "@/types/club";

type CartItem = { productId: string; quantity: number };
type OrderStep = 0 | 1 | 2;

const EMPTY_CATEGORIES: ProductCategory[] = [];
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_ORDER_ITEMS: OrderItem[] = [];

const ProductCatalogSection = memo(function ProductCatalogSection({
  category,
  products,
  currency,
  onOpenProduct,
  onAddProduct,
}: {
  category: ProductCategory;
  products: Product[];
  currency: string;
  onOpenProduct: (productId: string) => void;
  onAddProduct: (productId: string) => void;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-display text-2xl font-bold text-white">{category.name}</div>
          {category.description ? <div className="mt-1 text-sm text-slate-400">{category.description}</div> : null}
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
          {products.length} item
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4 text-left transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-white">{product.name}</div>
                <div className="mt-2 text-sm text-slate-400">
                  {product.unit} | Qoldiq {product.stock}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {product.stock <= product.threshold ? (
                  <div className="rounded-full border border-amber-300/18 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-amber-200">
                    Limit
                  </div>
                ) : null}
                <button
                  type="button"
                  className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-200 transition hover:border-cyan-300/32 hover:bg-cyan-300/14"
                  onClick={() => onAddProduct(product.id)}
                >
                  Tez qo&#39;shish
                </button>
              </div>
            </div>
            <div className="mt-4 font-display text-2xl font-bold text-cyan-200">
              {formatCurrency(product.price, currency)}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" className="gap-2" onClick={() => onOpenProduct(product.id)}>
                <PackageSearch className="h-4 w-4" />
                Batafsil
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const CartItemRow = memo(function CartItemRow({
  item,
  product,
  currency,
  onIncrement,
  onDecrement,
}: {
  item: CartItem;
  product: Product;
  currency: string;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{product.name}</div>
          <div className="mt-1 text-sm text-slate-400">
            {formatCurrency(product.price, currency)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-10 w-10 rounded-full px-0" onClick={() => onDecrement(item.productId)}>
            -
          </Button>
          <span className="w-8 text-center font-semibold text-white">{item.quantity}</span>
          <Button variant="secondary" className="h-10 w-10 rounded-full px-0" onClick={() => onIncrement(item.productId)}>
            +
          </Button>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-4 text-sm">
        <span className="text-slate-400">{item.quantity} x birlik narx</span>
        <span className="font-semibold text-white">
          {formatCurrency(product.price * item.quantity, currency)}
        </span>
      </div>
    </div>
  );
});

function getModeCopy(mode: "table" | "counter") {
  return mode === "table"
    ? {
        title: "Stol buyurtmasi",
        description: "Faol stolga biriktiriladi va session bill bilan yakunlanadi.",
      }
    : {
        title: "Kassa savdosi",
        description: "Alohida kassadan darhol sotiladi va mustaqil savdo sifatida saqlanadi.",
      };
}

export function OrdersPage() {
  const queryClient = useQueryClient();
  const bootstrapQuery = useBootstrapQuery();
  const { pushToast } = useToast();
  const [mode, setMode] = useState<"table" | "counter">("table");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState<OrderStep>(0);
  const [productDrawerId, setProductDrawerId] = useState<string | null>(null);
  const [productDrawerQuantity, setProductDrawerQuantity] = useState("1");
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<PrintableReceipt | null>(null);
  const [pending, startTransition] = useTransition();

  const activeTables = useMemo(
    () => bootstrapQuery.data?.tables.filter((table) => table.activeSession) ?? [],
    [bootstrapQuery.data],
  );

  const handleAddProduct = useCallback((productId: string) => {
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (existing) {
      return current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...current, { productId, quantity: 1 }];
    });
  }, []);

  const handleIncrement = useCallback((productId: string) => {
    setCart((current) =>
      current.map((entry) =>
        entry.productId === productId
          ? { ...entry, quantity: entry.quantity + 1 }
          : entry,
      ),
    );
  }, []);

  const handleDecrement = useCallback((productId: string) => {
    setCart((current) =>
      current
        .map((entry) =>
          entry.productId === productId
            ? { ...entry, quantity: entry.quantity - 1 }
            : entry,
        )
        .filter((entry) => entry.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  async function submitOrder() {
    if (!bootstrapQuery.data || cart.length === 0) {
      throw new Error("Savat bo'sh");
    }

    const route = mode === "table" ? "/api/orders" : "/api/counter-sales";
    const payload =
      mode === "table"
        ? { tableId: effectiveSelectedTableId, items: cart }
        : { customerName, items: cart };

    await postJson<{ ok: true }>(route, payload);
    setCart([]);
    setCustomerName("");
    await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  }

  const categories = bootstrapQuery.data?.categories ?? EMPTY_CATEGORIES;
  const products = bootstrapQuery.data?.products ?? EMPTY_PRODUCTS;
  const settings = bootstrapQuery.data?.settings;
  const orders = bootstrapQuery.data?.orders ?? [];
  const orderItems = bootstrapQuery.data?.orderItems ?? EMPTY_ORDER_ITEMS;
  const counterSales = bootstrapQuery.data?.counterSales ?? [];
  const lowStockProducts = bootstrapQuery.data?.lowStockProducts ?? [];
  const activeProductsCount = products.filter((product) => product.isActive).length;
  const lowStockCount = lowStockProducts.length;
  const counterRevenueToday = counterSales.reduce((sum, sale) => sum + sale.total, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const effectiveSelectedTableId = mode === "table" ? selectedTableId || activeTables[0]?.id || "" : selectedTableId;
  const selectedTable = activeTables.find((table) => table.id === effectiveSelectedTableId) ?? null;
  const selectedTargetLabel =
    mode === "table"
      ? selectedTable
        ? `${selectedTable.name} - ${selectedTable.activeSession?.customerName ?? "aktiv seans"}`
        : "Faol stol tanlanmagan"
      : customerName.trim() || "Kassa mijozi";

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0);
  }, [products, cart]);

  const cartLines = useMemo<PrintableReceiptLine[]>(
    () =>
      cart
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          if (!product) {
            return null;
          }

          return {
            name: product.name,
            quantity: item.quantity,
            unitPrice: product.price,
            total: product.price * item.quantity,
          };
        })
        .filter((item): item is PrintableReceiptLine => Boolean(item)),
    [cart, products],
  );

  const orderLinesByOrderId = useMemo(() => {
    const lines = new Map<string, PrintableReceiptLine[]>();
    for (const item of orderItems) {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) {
        continue;
      }

      const current = lines.get(item.orderId) ?? [];
      current.push({
        name: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.quantity,
      });
      lines.set(item.orderId, current);
    }
    return lines;
  }, [orderItems, products]);

  const activeProductsByCategory = useMemo(
    () =>
      categories.map((category) => ({
        category,
        products: products.filter((product) => product.categoryId === category.id && product.isActive),
      })),
    [categories, products],
  );

  const modeCopy = getModeCopy(mode);
  const selectedProduct = products.find((product) => product.id === productDrawerId) ?? null;
  const builderDirty =
    cart.length > 0 ||
    builderStep > 0 ||
    (mode === "counter" ? customerName.trim() !== "" : selectedTableId !== "");
  const productDrawerDirty = productDrawerQuantity !== "1";
  const lowStockCartProducts = cart
    .map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) {
        return null;
      }
      return product.stock <= product.threshold ? product : null;
    })
    .filter((product): product is Product => Boolean(product));

  function openBuilder() {
    setBuilderStep(0);
    setBuilderOpen(true);
  }

  function handleOpenProduct(productId: string) {
    setProductDrawerId(productId);
    setProductDrawerQuantity("1");
  }

  function handleCloseProductDrawer() {
    setProductDrawerId(null);
    setProductDrawerQuantity("1");
  }

  function buildCounterReceipt(lines: PrintableReceiptLine[], issuedAt: string, sale?: CounterSale) {
    if (!settings || !bootstrapQuery.data) {
      throw new Error("Chek uchun klub ma'lumotlari hali tayyor emas");
    }

    return {
      title: "Kassa cheki",
      clubName: settings.clubName,
      documentCode: createDocumentCode("SALE", sale?.id ?? issuedAt),
      printedAt: issuedAt,
      timezone: settings.timezone,
      currency: settings.currency,
      operatorName: bootstrapQuery.data.operator.name,
      modeLabel: "Kassa savdosi",
      customerName: sale?.customerName ?? (customerName.trim() || "Kassa mijozi"),
      items: lines,
      adjustments: [],
      total: sale?.total ?? lines.reduce((sum, item) => sum + item.total, 0),
      notes: ["Alohida kassadan yakunlangan savdo."],
      footerNote: "Termal printer uchun mos 80mm chek.",
    } satisfies PrintableReceipt;
  }

  function handlePrintReceipt(receipt: PrintableReceipt) {
    try {
      openPrintDocument({
        title: receipt.documentCode,
        bodyHtml: buildReceiptHtml(receipt),
      });
      pushToast({
        title: "Chek chop etish ochildi",
        description: "Brauzer print dialogi ishga tushirildi.",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Chek chiqarilmadi",
        description: error instanceof Error ? error.message : "Print oynasini ochib bo'lmadi",
        tone: "error",
      });
    }
  }

  function openRecentCounterReceipt(sale: CounterSale) {
    const lines = orderLinesByOrderId.get(sale.orderId) ?? [];
    setReceiptPreview(buildCounterReceipt(lines, sale.createdAt, sale));
  }

  function handleBuilderNext() {
    if (builderStep === 0) {
      if (mode === "table" && !effectiveSelectedTableId) {
        pushToast({
          title: "Faol stol tanlanmagan",
          description: "Buyurtmani stolga biriktirish uchun aktiv seansni tanlang.",
          tone: "error",
        });
        return;
      }
      setBuilderStep(1);
      return;
    }

    if (builderStep === 1) {
      if (cart.length === 0) {
        pushToast({
          title: "Savat bo'sh",
          description: "Checkout oldidan kamida bitta mahsulot qo'shing.",
          tone: "error",
        });
        return;
      }
      setBuilderStep(2);
      return;
    }

    startTransition(async () => {
      try {
        const issuedAt = new Date().toISOString();
        const receiptDraft =
          mode === "counter" ? buildCounterReceipt(cartLines, issuedAt) : null;
        await submitOrder();
        setBuilderOpen(false);
        setBuilderStep(0);
        if (receiptDraft) {
          setReceiptPreview(receiptDraft);
        }
        pushToast({
          title: "Buyurtma saqlandi",
          description: mode === "table" ? "Order stol seansiga biriktirildi." : "Kassa savdosi yaratildi.",
          tone: "success",
        });
      } catch (error) {
        pushToast({
          title: "Buyurtma saqlanmadi",
          description: error instanceof Error ? error.message : "Xatolik yuz berdi",
          tone: "error",
        });
      }
    });
  }

  if (bootstrapQuery.isPending || !bootstrapQuery.data || !settings) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }

  return (
    <div className="space-y-5 pb-28 md:pb-8">
      <SectionHeader
        eyebrow="Buyurtmalar"
        title="Bar va kassadagi savdo"
        description="Sahifa katalog va nazorat uchun qoldi. Buyurtmani yig'ish va checkout esa alohida premium modal workflow ichida bajariladi."
        action={
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2" onClick={openBuilder}>
              <ShoppingBasket className="h-4 w-4" />
              Buyurtma oynasi
            </Button>
            {cart.length > 0 ? (
              <Button variant="secondary" className="gap-2" onClick={clearCart}>
                Savatni tozalash
              </Button>
            ) : null}
          </div>
        }
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

      <Reveal>
        <Panel tone="cyan" className="hud-frame">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300/70">Order control rail</div>
              <div className="mt-2 font-display text-2xl font-bold text-white">{modeCopy.title}</div>
              <div className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{modeCopy.description}</div>
            </div>
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
                <WalletCards className="h-4 w-4" />
                Kassa savdosi
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ModalStat label="Target" value={selectedTargetLabel} hint={mode === "table" ? "Faol sessionga ulanadi" : "Mustaqil savdo"} />
            <ModalStat label="Savat" value={`${cartCount} item`} hint={`${cart.length} ta pozitsiya`} />
            <ModalStat label="Jami summa" value={formatCurrency(cartTotal, settings.currency)} hint="Checkout snapshot" />
            <ModalStat label="Low stock" value={`${lowStockCount}`} hint="Diqqat talab qiladi" />
          </div>
        </Panel>
      </Reveal>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <Reveal>
          <Panel tone="slate" className="hud-frame">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-2xl font-bold text-white">Mahsulot katalogi</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Kartani bosing va savatga qo&#39;shing
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {activeProductsByCategory.map(({ category, products: categoryProducts }) => (
                <ProductCatalogSection
                  key={category.id}
                  category={category}
                  products={categoryProducts}
                  currency={settings.currency}
                  onOpenProduct={handleOpenProduct}
                  onAddProduct={handleAddProduct}
                />
              ))}
            </div>
          </Panel>
        </Reveal>

        <div className="space-y-5">
          <Reveal>
            <Panel tone="green" className="hud-frame">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-2xl font-bold text-white">Savdo holati</div>
                <ShoppingBasket className="h-5 w-5 text-cyan-200" />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Joriy mode</div>
                  <div className="mt-3 font-display text-2xl font-bold text-white">{modeCopy.title}</div>
                  <div className="mt-2 text-sm text-slate-400">{modeCopy.description}</div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Checkout target</div>
                  <div className="mt-3 font-display text-2xl font-bold text-white">{selectedTargetLabel}</div>
                  <div className="mt-2 text-sm text-slate-400">
                    {mode === "table" ? "Aktiv stolga biriktiriladi" : "Kassa orqali yakunlanadi"}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-cyan-300/18 bg-cyan-300/10 p-4">
                <div className="text-sm text-cyan-100">Savat snapshot</div>
                <div className="mt-2 font-display text-3xl font-bold text-white">
                  {formatCurrency(cartTotal, settings.currency)}
                </div>
                <div className="mt-2 text-sm text-cyan-100/80">{cartCount} item | {cart.length} pozitsiya</div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="gap-2" onClick={openBuilder}>
                  <ReceiptText className="h-4 w-4" />
                  Checkout oynasi
                </Button>
                {cart.length > 0 ? (
                  <Button variant="secondary" onClick={clearCart}>
                    Savatni tozalash
                  </Button>
                ) : null}
              </div>
            </Panel>
          </Reveal>

          <Reveal>
            <Panel tone="amber" className="hud-frame">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-2xl font-bold text-white">So&#39;nggi savdolar</div>
                {lowStockProducts.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setLowStockOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-300/18 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-amber-200 transition hover:border-amber-300/30 hover:bg-amber-400/14"
                  >
                    <TriangleAlert className="h-3.5 w-3.5" />
                    {lowStockProducts.length} ta mahsulot past qoldiqda
                  </button>
                ) : null}
              </div>

              {counterSales.length === 0 && orders.length === 0 ? (
                <EmptyState
                  title="Savdo hali yo&#39;q"
                  description="Biror buyurtma o&#39;tkazilgach shu yerda ko&#39;rinadi."
                />
              ) : (
                <div className="mt-5 space-y-3">
                  {counterSales.slice(0, 4).map((sale) => (
                    <div key={sale.id} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white">{sale.customerName ?? "Kassa mijozi"}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {formatDateTimeLabel(sale.createdAt, settings.timezone)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" className="gap-2" onClick={() => openRecentCounterReceipt(sale)}>
                            <Printer className="h-4 w-4" />
                            Chek
                          </Button>
                          <div className="font-display text-2xl font-bold text-emerald-200">
                            {formatCurrency(sale.total, settings.currency)}
                          </div>
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

      <Drawer
        open={productDrawerId !== null}
        onClose={handleCloseProductDrawer}
        title={selectedProduct?.name ?? "Mahsulot"}
        description="Mahsulot tafsiloti, qoldiq holati va savatga qo'shish shu drawer ichida boshqariladi."
        tone={selectedProduct && selectedProduct.stock <= selectedProduct.threshold ? "amber" : "cyan"}
        size="md"
        icon={<PackageSearch className="h-5 w-5" />}
        headerMeta={
          selectedProduct ? (
            <>
              <div className="data-chip">{selectedProduct.unit}</div>
              <div className="data-chip">Qoldiq {selectedProduct.stock}</div>
            </>
          ) : undefined
        }
        footer={
          selectedProduct ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <ModalDismissButton variant="secondary">
                  Yopish
                </ModalDismissButton>
              <Button
                className="gap-2"
                onClick={() => {
                  const quantity = Math.max(1, Number(productDrawerQuantity) || 1);
                  for (let index = 0; index < quantity; index += 1) {
                    handleAddProduct(selectedProduct.id);
                  }
                  pushToast({
                    title: "Savat yangilandi",
                    description: `${selectedProduct.name} savatga qo'shildi.`,
                    tone: "success",
                  });
                  handleCloseProductDrawer();
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                Savatga qo&#39;shish
              </Button>
            </div>
          ) : undefined
        }
        closeGuard={{ when: productDrawerDirty }}
        hotkeys={
          selectedProduct
            ? [
                {
                  key: "Enter",
                  ctrlOrMeta: true,
                  allowInInput: true,
                  label: "Savatga qo'shish",
                  action: () => {
                    const quantity = Math.max(1, Number(productDrawerQuantity) || 1);
                    for (let index = 0; index < quantity; index += 1) {
                      handleAddProduct(selectedProduct.id);
                    }
                    pushToast({
                      title: "Savat yangilandi",
                      description: `${selectedProduct.name} savatga qo'shildi.`,
                      tone: "success",
                    });
                    handleCloseProductDrawer();
                  },
                },
              ]
            : undefined
        }
      >
        {selectedProduct ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <ModalStat label="Narx" value={formatCurrency(selectedProduct.price, settings.currency)} hint="Retail price" />
              <ModalStat label="Qoldiq" value={`${selectedProduct.stock}`} hint={`Threshold ${selectedProduct.threshold}`} />
              <ModalStat label="Kategoriya" value={categories.find((item) => item.id === selectedProduct.categoryId)?.name ?? "Kategoriya"} hint={selectedProduct.isActive ? "Faol" : "Nofaol"} />
            </div>
            <ModalNote tone={selectedProduct.stock <= selectedProduct.threshold ? "amber" : "cyan"}>
              {selectedProduct.stock <= selectedProduct.threshold
                ? "Bu mahsulot kritik qoldiq zonasiga yaqin. Checkout oldidan real qoldiqni tekshirib oling."
                : "Mahsulot savdo katalogida faol va tez qo'shish uchun tayyor."}
            </ModalNote>
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div>
                <div className="mb-2 text-sm text-slate-400">Mahsulot tavsifi</div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm leading-7 text-slate-300">
                  {categories.find((item) => item.id === selectedProduct.categoryId)?.description ?? "Kategoriya tavsifi yo'q. Mahsulotni savatga qo'shib checkout workflow orqali yakunlang."}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Miqdor</label>
                <Input
                  type="number"
                  min="1"
                  value={productDrawerQuantity}
                  onChange={(event) => setProductDrawerQuantity(event.target.value)}
                />
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      <ResponsiveModal
        open={lowStockOpen}
        onClose={() => setLowStockOpen(false)}
        title="Past qoldiq nazorati"
        description="Kassir checkout oldidan kritik mahsulotlarni shu modal ichida tez ko'radi. Bu sahifa katalogni yengil saqlaydi."
        tone="amber"
        size="md"
        icon={<TriangleAlert className="h-5 w-5" />}
        headerMeta={
          <>
            <div className="data-chip">{lowStockProducts.length} mahsulot</div>
            <div className="data-chip">{formatCurrency(counterRevenueToday, settings.currency)}</div>
          </>
        }
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setLowStockOpen(false)}>
              Yopish
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <ModalStat label="Past qoldiq" value={`${lowStockProducts.length}`} hint="Tez tekshiruv" />
            <ModalStat label="Faol katalog" value={`${activeProductsCount}`} hint="Sotuvdagi mahsulotlar" />
            <ModalStat label="Savat" value={`${cartCount} item`} hint="Joriy checkout" />
          </div>
          <ModalNote tone="amber">
            Kritik mahsulotlar checkout va table order flow ichida xato qoldiq holatlari bermasligi uchun shu yerda nazorat qilinadi.
          </ModalNote>
          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-500">
                Hozir kritik qoldiqdagi mahsulot yo&#39;q.
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    setLowStockOpen(false);
                    handleOpenProduct(product.id);
                  }}
                  className="w-full rounded-[22px] border border-white/8 bg-white/[0.04] p-4 text-left transition hover:border-amber-300/28 hover:bg-amber-400/[0.06]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-white">{product.name}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        {product.unit} | Qoldiq {product.stock} | Limit {product.threshold}
                      </div>
                    </div>
                    <div className="font-display text-2xl font-bold text-amber-200">
                      {formatCurrency(product.price, settings.currency)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        open={Boolean(receiptPreview)}
        onClose={() => setReceiptPreview(null)}
        title="Chek preview"
        description="Kassir shu oynada yakuniy chekni ko'rib, termal printerga chiqaradi yoki qayta chop etadi."
        tone="green"
        size="lg"
        icon={<Printer className="h-5 w-5" />}
        headerMeta={
          receiptPreview ? (
            <>
              <div className="data-chip">{receiptPreview.documentCode}</div>
              <div className="data-chip">{receiptPreview.modeLabel}</div>
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

      <WizardModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        title="Buyurtma yig&#39;ish va checkout"
        description="Target, savat va yakuniy checkout uchta aniq bosqich bilan boshqariladi."
        steps={["Target", "Savat", "Tasdiq"]}
        currentStep={builderStep}
        onPrev={builderStep > 0 ? () => setBuilderStep((current) => (current - 1) as OrderStep) : undefined}
        onNext={handleBuilderNext}
        nextLabel={
          builderStep === 2
            ? mode === "table"
              ? "Stolga biriktirish"
              : "Kassa savdosini yaratish"
            : builderStep === 1
              ? "Tasdiqqa o'tish"
              : "Savat bosqichi"
        }
        canGoNext={builderStep === 0 ? (mode === "counter" ? true : Boolean(selectedTableId)) : builderStep === 1 ? cart.length > 0 : true}
        pending={pending}
        closeGuard={{ when: builderDirty }}
      >
        <div className="space-y-5">
          {builderStep === 0 ? (
            <>
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

              <div className="grid gap-4 md:grid-cols-3">
                <ModalStat label="Target" value={selectedTargetLabel} hint={mode === "table" ? "Faol session" : "Counter flow"} />
                <ModalStat label="Savat" value={`${cartCount} item`} hint={`${cart.length} pozitsiya`} />
                <ModalStat label="Jami" value={formatCurrency(cartTotal, settings.currency)} hint="Checkout snapshot" />
              </div>

              <ModalNote tone={mode === "table" ? "cyan" : "green"}>
                {mode === "table"
                  ? "Bu order stolning aktiv session billiga qo'shiladi va yakuniy chek bilan yopiladi."
                  : "Bu savdo alohida kassadan mustaqil sale sifatida saqlanadi."}
              </ModalNote>

              {mode === "table" ? (
                <div>
                  <label className="mb-2 block text-sm text-slate-400">Faol stol</label>
                  <Select value={effectiveSelectedTableId} onChange={(event) => setSelectedTableId(event.target.value)}>
                    <option value="">Stol tanlang</option>
                    {activeTables.map((table: TableSnapshot) => (
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
            </>
          ) : null}

          {builderStep === 1 ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <ModalStat label="Pozitsiyalar" value={`${cart.length}`} hint="Savat bloklari" />
                <ModalStat label="Itemlar" value={`${cartCount}`} hint="Jami birliklar" />
                <ModalStat label="Jami" value={formatCurrency(cartTotal, settings.currency)} hint="Current snapshot" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Savat tarkibi</div>
                  {cart.length > 0 ? (
                    <Button variant="ghost" onClick={clearCart}>
                      Savatni tozalash
                    </Button>
                  ) : null}
                </div>
                {cart.length === 0 ? (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-500">
                    Savat bo&#39;sh. Mahsulotlarni katalogdan tanlang yoki product drawer orqali qo&#39;shing.
                  </div>
                ) : (
                  cart.map((item) => {
                    const product = products.find((candidate) => candidate.id === item.productId);
                    if (!product) {
                      return null;
                    }

                    return (
                      <CartItemRow
                        key={item.productId}
                        item={item}
                        product={product}
                        currency={settings.currency}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                      />
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {builderStep === 2 ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <ModalStat label="Mode" value={modeCopy.title} hint="Checkout turi" />
                <ModalStat label="Target" value={selectedTargetLabel} hint="Biriktirish nuqtasi" />
                <ModalStat label="Jami summa" value={formatCurrency(cartTotal, settings.currency)} hint={`${cartCount} item`} />
              </div>
              {lowStockCartProducts.length > 0 ? (
                <ModalNote tone="amber">
                  Savatda kritik qoldiqdagi mahsulotlar bor: {lowStockCartProducts.map((product) => product.name).join(", ")}.
                </ModalNote>
              ) : (
                <ModalNote tone={mode === "table" ? "cyan" : "green"}>
                  {mode === "table"
                    ? "Tasdiqlangach order darhol stol sessioniga biriktiriladi."
                    : "Tasdiqlangach kassa savdosi mustaqil transaction sifatida saqlanadi."}
                </ModalNote>
              )}
              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white">Yakuniy tarkib</div>
                <div className="mt-4 space-y-3">
                  {cart.map((item) => {
                    const product = products.find((candidate) => candidate.id === item.productId);
                    if (!product) {
                      return null;
                    }

                    return (
                      <div key={item.productId} className="flex items-center justify-between gap-4 text-sm">
                        <div className="text-slate-300">
                          {product.name} <span className="text-slate-500">x {item.quantity}</span>
                        </div>
                        <div className="font-semibold text-white">
                          {formatCurrency(product.price * item.quantity, settings.currency)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </WizardModal>

      {cart.length > 0 ? (
        <div className="fixed inset-x-4 bottom-4 z-40 xl:hidden">
          <button
            type="button"
            onClick={openBuilder}
            className="w-full rounded-[24px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(39,230,245,0.16),rgba(45,255,138,0.14))] px-5 py-4 text-left shadow-[0_18px_34px_rgba(0,0,0,0.22)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Faol savat</div>
                <div className="mt-2 font-display text-xl font-bold text-white">
                  {cartCount} item | {formatCurrency(cartTotal, settings.currency)}
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white">
                Ochish
              </div>
            </div>
          </button>
        </div>
      ) : null}
    </div>
  );
}
