import { addHours, addMinutes, subDays, subHours, subMinutes } from "date-fns";

import type {
  AuditLog,
  BillAdjustment,
  CashMovement,
  ClubSettings,
  Order,
  OrderItem,
  Product,
  ProductCategory,
  Reservation,
  Shift,
  ShiftEvent,
  StockMovement,
  Table,
  TableSession,
} from "@/types/club";

export interface SeedDataset {
  settings: ClubSettings;
  tables: Table[];
  categories: ProductCategory[];
  products: Product[];
  sessions: TableSession[];
  reservations: Reservation[];
  orders: Order[];
  orderItems: OrderItem[];
  stockMovements: StockMovement[];
  cashMovements: CashMovement[];
  billAdjustments: BillAdjustment[];
  shifts: Shift[];
  shiftEvents: ShiftEvent[];
  auditLogs: AuditLog[];
}

export function createSeedDataset(now = new Date()): SeedDataset {
  const settings: ClubSettings = {
    clubName: "Billiards Pro Tashkent",
    currency: "UZS",
    timezone: "Asia/Tashkent",
    operatorName: "Aziz Manager",
    operatorEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@billiards.uz",
    standardHourlyRate: 120000,
    vipHourlyRate: 180000,
    showActivityChart: true,
    showRightRail: true,
  };

  const tables: Table[] = [
    { id: "table-1", name: "Rus stoli 1", type: "standard", position: 1, accentColor: "#27E6F5", isActive: true },
    { id: "table-2", name: "Rus stoli 2", type: "standard", position: 2, accentColor: "#2DFF8A", isActive: true },
    { id: "table-3", name: "Rus stoli 3", type: "standard", position: 3, accentColor: "#2DFF8A", isActive: true },
    { id: "table-4", name: "Rus stoli 4", type: "standard", position: 4, accentColor: "#F4C34E", isActive: true },
    { id: "table-5", name: "Rus stoli 5", type: "standard", position: 5, accentColor: "#F4C34E", isActive: true },
    { id: "table-6", name: "VIP stoli 6", type: "vip", position: 6, accentColor: "#94A3B8", isActive: true },
    { id: "table-7", name: "VIP stoli 7", type: "vip", position: 7, accentColor: "#94A3B8", isActive: true },
  ];

  const categories: ProductCategory[] = [
    { id: "cat-hot", name: "Issiq ichimlik", position: 1 },
    { id: "cat-cold", name: "Sovuq ichimlik", position: 2 },
    { id: "cat-snack", name: "Snek", position: 3 },
  ];

  const products: Product[] = [
    { id: "product-tea", categoryId: "cat-hot", name: "Qora choy", unit: "chashka", price: 18000, costPrice: 6000, stock: 40, threshold: 10, isActive: true },
    { id: "product-americano", categoryId: "cat-hot", name: "Americano", unit: "stakan", price: 28000, costPrice: 11000, stock: 26, threshold: 8, isActive: true },
    { id: "product-cola", categoryId: "cat-cold", name: "Cola 0.5", unit: "dona", price: 22000, costPrice: 13000, stock: 20, threshold: 6, isActive: true },
    { id: "product-water", categoryId: "cat-cold", name: "Suv 0.5", unit: "dona", price: 9000, costPrice: 4000, stock: 22, threshold: 8, isActive: true },
    { id: "product-chips", categoryId: "cat-snack", name: "Chips", unit: "qadoq", price: 24000, costPrice: 12000, stock: 14, threshold: 5, isActive: true },
    { id: "product-nuts", categoryId: "cat-snack", name: "Yong'oq mix", unit: "qadoq", price: 32000, costPrice: 17000, stock: 9, threshold: 4, isActive: true },
  ];

  const sessions: TableSession[] = [
    {
      id: "session-1",
      tableId: "table-1",
      customerName: "Jasur Karimov",
      startedAt: subMinutes(now, 95).toISOString(),
      hourlyRateSnapshot: settings.standardHourlyRate,
      status: "active",
    },
    {
      id: "session-2",
      tableId: "table-2",
      customerName: "Bekzod Team",
      startedAt: subMinutes(now, 54).toISOString(),
      hourlyRateSnapshot: settings.standardHourlyRate,
      status: "active",
    },
    {
      id: "session-3",
      tableId: "table-3",
      customerName: "Server Cup",
      startedAt: subMinutes(now, 36).toISOString(),
      hourlyRateSnapshot: settings.standardHourlyRate,
      status: "active",
    },
    {
      id: "session-4",
      tableId: "table-6",
      customerName: "VIP Club",
      startedAt: subHours(subDays(now, 1), 3).toISOString(),
      endedAt: subDays(now, 1).toISOString(),
      hourlyRateSnapshot: settings.vipHourlyRate,
      status: "completed",
    },
    {
      id: "session-5",
      tableId: "table-2",
      customerName: "Late Night Match",
      startedAt: subHours(now, 8).toISOString(),
      endedAt: subHours(now, 6).toISOString(),
      hourlyRateSnapshot: settings.standardHourlyRate,
      status: "completed",
    },
  ];

  const reservations: Reservation[] = [
    {
      id: "reservation-1",
      tableId: "table-4",
      customerName: "Alisher",
      phone: "+998 90 001 22 33",
      guests: 4,
      note: "Tug'ilgan kun uchun stol",
      startAt: addMinutes(now, 30).toISOString(),
      endAt: addHours(now, 2).toISOString(),
      status: "scheduled",
      createdAt: subHours(now, 2).toISOString(),
    },
    {
      id: "reservation-2",
      tableId: "table-5",
      customerName: "Kamola",
      phone: "+998 97 111 44 55",
      guests: 3,
      startAt: addHours(now, 1).toISOString(),
      endAt: addHours(now, 3).toISOString(),
      status: "scheduled",
      createdAt: subHours(now, 1).toISOString(),
    },
    {
      id: "reservation-3",
      tableId: "table-7",
      customerName: "Premium Liga",
      phone: "+998 99 321 00 00",
      guests: 2,
      startAt: subHours(now, 5).toISOString(),
      endAt: subHours(now, 3).toISOString(),
      status: "completed",
      createdAt: subHours(now, 7).toISOString(),
    },
  ];

  const orders: Order[] = [
    {
      id: "order-1",
      mode: "table",
      status: "confirmed",
      createdAt: subMinutes(now, 70).toISOString(),
      sessionId: "session-1",
      tableId: "table-1",
      note: "Tez xizmat",
    },
    {
      id: "order-2",
      mode: "counter",
      status: "paid",
      createdAt: subHours(now, 2).toISOString(),
      paidAt: subHours(now, 2).toISOString(),
      customerName: "Lobby guest",
    },
    {
      id: "order-3",
      mode: "table",
      status: "paid",
      createdAt: subHours(now, 7).toISOString(),
      paidAt: subHours(now, 6).toISOString(),
      sessionId: "session-5",
      tableId: "table-2",
    },
  ];

  const orderItems: OrderItem[] = [
    { id: "item-1", orderId: "order-1", productId: "product-cola", quantity: 2, unitPrice: 22000 },
    { id: "item-2", orderId: "order-1", productId: "product-chips", quantity: 1, unitPrice: 24000 },
    { id: "item-3", orderId: "order-2", productId: "product-water", quantity: 2, unitPrice: 9000 },
    { id: "item-4", orderId: "order-2", productId: "product-nuts", quantity: 1, unitPrice: 32000 },
    { id: "item-5", orderId: "order-3", productId: "product-tea", quantity: 3, unitPrice: 18000 },
  ];

  const stockMovements: StockMovement[] = [
    { id: "movement-1", productId: "product-tea", type: "in", quantity: 43, reason: "Boshlang'ich ombor", resultingStock: 43, createdAt: subDays(now, 7).toISOString() },
    { id: "movement-2", productId: "product-tea", type: "out", quantity: 3, reason: "Late Night Match seansi", resultingStock: 40, createdAt: subHours(now, 6).toISOString() },
    { id: "movement-3", productId: "product-americano", type: "in", quantity: 26, reason: "Boshlang'ich ombor", resultingStock: 26, createdAt: subDays(now, 7).toISOString() },
    { id: "movement-4", productId: "product-cola", type: "in", quantity: 20, reason: "Boshlang'ich ombor", resultingStock: 20, createdAt: subDays(now, 7).toISOString() },
    { id: "movement-5", productId: "product-water", type: "in", quantity: 24, reason: "Boshlang'ich ombor", resultingStock: 24, createdAt: subDays(now, 7).toISOString() },
    { id: "movement-6", productId: "product-water", type: "out", quantity: 2, reason: "Lobby guest counter savdosi", resultingStock: 22, createdAt: subHours(now, 2).toISOString() },
    { id: "movement-7", productId: "product-chips", type: "in", quantity: 14, reason: "Boshlang'ich ombor", resultingStock: 14, createdAt: subDays(now, 7).toISOString() },
    { id: "movement-8", productId: "product-nuts", type: "in", quantity: 10, reason: "Boshlang'ich ombor", resultingStock: 10, createdAt: subDays(now, 7).toISOString() },
    { id: "movement-9", productId: "product-nuts", type: "out", quantity: 1, reason: "Lobby guest counter savdosi", resultingStock: 9, createdAt: subHours(now, 2).toISOString() },
  ];

  const cashMovements: CashMovement[] = [
    {
      id: "cash-1",
      type: "service_in",
      amount: 300000,
      reason: "Smena boshida kassaga xizmat puli kiritildi",
      shiftId: "shift-0",
      createdAt: subHours(now, 8).toISOString(),
    },
    {
      id: "cash-2",
      type: "change",
      amount: 120000,
      reason: "Mayda pul uchun razmen qilindi",
      shiftId: "shift-0",
      createdAt: subHours(now, 5).toISOString(),
    },
    {
      id: "cash-3",
      type: "expense",
      amount: 45000,
      reason: "Tozalash vositalari uchun xizmat xarajati",
      shiftId: "shift-1",
      createdAt: subHours(now, 2).toISOString(),
    },
  ];

  const billAdjustments: BillAdjustment[] = [
    {
      id: "adjustment-1",
      sessionId: "session-1",
      type: "manual_charge",
      amount: 20000,
      shiftId: "shift-1",
      reason: "Qo'shimcha stol aksessuari",
      createdAt: subMinutes(now, 20).toISOString(),
    },
    {
      id: "adjustment-2",
      sessionId: "session-5",
      type: "manual_charge",
      amount: -30000,
      shiftId: "shift-0",
      reason: "Operator qo'lda kamaytirgan summa",
      createdAt: subHours(now, 5).toISOString(),
    },
  ];

  const shifts: Shift[] = [
    {
      id: "shift-0",
      status: "closed",
      openingCash: 260000,
      closingCash: 840000,
      openedByOperatorId: "operator-cashier",
      closedByOperatorId: "operator-admin",
      note: "Kechki smena yakunlandi",
      openedAt: subHours(now, 9).toISOString(),
      closedAt: subHours(now, 4).toISOString(),
      updatedAt: subHours(now, 4).toISOString(),
    },
    {
      id: "shift-1",
      status: "open",
      openingCash: 450000,
      openedByOperatorId: "operator-admin",
      openedAt: subHours(now, 3).toISOString(),
      updatedAt: subHours(now, 3).toISOString(),
    },
  ];

  const shiftEvents: ShiftEvent[] = [
    {
      id: "shift-event-0",
      shiftId: "shift-0",
      operatorId: "operator-cashier",
      type: "opened",
      note: "Kechki smena ochildi",
      createdAt: subHours(now, 9).toISOString(),
    },
    {
      id: "shift-event-0b",
      shiftId: "shift-0",
      operatorId: "operator-admin",
      type: "closed",
      note: "Smena yakunlandi",
      createdAt: subHours(now, 4).toISOString(),
    },
    {
      id: "shift-event-1",
      shiftId: "shift-1",
      operatorId: "operator-admin",
      type: "opened",
      note: "Tonggi smena ochildi",
      createdAt: subHours(now, 3).toISOString(),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: "audit-1",
      operatorId: "operator-cashier",
      action: "shift.closed",
      entityType: "shift",
      entityId: "shift-0",
      description: "Kechki smena yopildi",
      createdAt: subHours(now, 4).toISOString(),
    },
    {
      id: "audit-2",
      operatorId: "operator-admin",
      action: "shift.opened",
      entityType: "shift",
      entityId: "shift-1",
      description: "Tonggi smena ochildi",
      createdAt: subHours(now, 3).toISOString(),
    },
    {
      id: "audit-3",
      operatorId: "operator-admin",
      action: "cash.movement.created",
      entityType: "cash",
      entityId: "cash-1",
      description: "Smena boshida kassaga xizmat puli kiritildi",
      createdAt: subHours(now, 8).toISOString(),
    },
    {
      id: "audit-4",
      operatorId: "operator-admin",
      action: "bill.adjustment.created",
      entityType: "bill",
      entityId: "adjustment-1",
      description: "Qo'lda billing tuzatishi qo'shildi",
      createdAt: subMinutes(now, 20).toISOString(),
    },
  ];

  return {
    settings,
    tables,
    categories,
    products,
    sessions,
    reservations,
    orders,
    orderItems,
    stockMovements,
    cashMovements,
    billAdjustments,
    shifts,
    shiftEvents,
    auditLogs,
  };
}
