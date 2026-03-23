export type TableType = "standard" | "vip";
export type TableStatus = "free" | "active" | "reserved";
export type SessionStatus = "active" | "completed";
export type ReservationStatus = "scheduled" | "arrived" | "completed" | "cancelled";
export type OrderMode = "table" | "counter";
export type OrderStatus = "confirmed" | "paid" | "cancelled";
export type StockMovementType = "in" | "out" | "correction";
export type CashMovementType = "service_in" | "service_out" | "expense" | "cash_drop" | "change";
export type BillAdjustmentType = "manual_charge";
export type OperatorRole = "admin" | "cashier";
export type ShiftStatus = "open" | "paused" | "closed";
export type ShiftEventType = "opened" | "paused" | "resumed" | "closed";
export type AuditEntityType =
  | "auth"
  | "shift"
  | "session"
  | "reservation"
  | "order"
  | "cash"
  | "bill"
  | "inventory"
  | "settings"
  | "operator";
export type ReportRange = "day" | "week" | "month" | "year";

export interface Table {
  id: string;
  name: string;
  type: TableType;
  position: number;
  accentColor: string;
  isActive: boolean;
}

export interface TableSession {
  id: string;
  tableId: string;
  customerName: string;
  note?: string;
  startedAt: string;
  endedAt?: string;
  hourlyRateSnapshot: number;
  status: SessionStatus;
}

export interface Reservation {
  id: string;
  tableId: string;
  customerName: string;
  phone: string;
  guests: number;
  note?: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  sessionId?: string;
  createdAt?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  position?: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  unit: string;
  price: number;
  costPrice: number;
  stock: number;
  threshold: number;
  isActive: boolean;
}

export interface Order {
  id: string;
  mode: OrderMode;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  note?: string;
  tableId?: string;
  sessionId?: string;
  customerName?: string;
  counterSaleId?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CounterSale {
  id: string;
  orderId: string;
  customerName?: string;
  createdAt: string;
  total: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  resultingStock: number;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  operatorId?: string;
  shiftId?: string;
  createdAt: string;
}

export interface BillAdjustment {
  id: string;
  sessionId: string;
  operatorId?: string;
  shiftId?: string;
  type: BillAdjustmentType;
  amount: number;
  reason?: string;
  createdAt: string;
}

export interface Shift {
  id: string;
  status: ShiftStatus;
  openingCash: number;
  closingCash?: number;
  openedByOperatorId?: string;
  closedByOperatorId?: string;
  note?: string;
  openedAt: string;
  pausedAt?: string;
  closedAt?: string;
  updatedAt: string;
}

export interface ShiftEvent {
  id: string;
  shiftId: string;
  operatorId?: string;
  type: ShiftEventType;
  note?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  operatorId?: string;
  action: string;
  entityType: AuditEntityType;
  entityId?: string;
  description: string;
  metadata?: string;
  createdAt: string;
}

export interface ClubSettings {
  clubName: string;
  currency: string;
  timezone: string;
  operatorName: string;
  operatorEmail: string;
  standardHourlyRate: number;
  vipHourlyRate: number;
  showActivityChart: boolean;
  showRightRail: boolean;
}

export interface SessionSummary {
  baseGameCharge: number;
  gameCharge: number;
  orderTotal: number;
  adjustmentAmount: number;
  total: number;
  durationMinutes: number;
}

export interface TableSnapshot {
  id: string;
  name: string;
  type: TableType;
  position: number;
  accentColor: string;
  status: TableStatus;
  hourlyRate: number;
  activeSession: TableSession | null;
  nextReservation: Reservation | null;
  pendingOrderTotal: number;
  currentSummary: SessionSummary | null;
}

export interface DashboardKpis {
  totalRevenue: number;
  activeTables: number;
  reservationsToday: number;
  gamesToday: number;
  occupancyRate: number;
  barRevenue: number;
  cashOnHand: number;
  cashAdjustmentNet: number;
  cashMovementsToday: number;
  billAdjustmentsToday: number;
}

export interface DashboardActivityPoint {
  label: string;
  occupancy: number;
  revenue: number;
}

export interface OperatorSession {
  id: string;
  name: string;
  email: string;
  role: OperatorRole;
  mode: "database";
}

export interface OperatorSummary {
  id: string;
  name: string;
  email: string;
  role: OperatorRole;
  isActive: boolean;
  createdAt?: string;
}

export interface BootstrapPayload {
  operator: OperatorSession;
  operators: OperatorSummary[];
  settings: ClubSettings;
  tables: TableSnapshot[];
  reservations: Reservation[];
  categories: ProductCategory[];
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  counterSales: CounterSale[];
  stockMovements: StockMovement[];
  cashMovements: CashMovement[];
  billAdjustments: BillAdjustment[];
  activeShift: Shift | null;
  shiftEvents: ShiftEvent[];
  auditLogs: AuditLog[];
  kpis: DashboardKpis;
  lowStockProducts: Product[];
  generatedAt: string;
}

export interface RangeReport {
  range: ReportRange;
  label: string;
  revenue: number;
  gameRevenue: number;
  barRevenue: number;
  adjustmentsTotal: number;
  sessionsCount: number;
  occupancyRate: number;
  playMinutes: number;
  currency: string;
  timezone: string;
  periodStart: string;
  periodEnd: string;
  cashDiscrepancyTotal: number;
  topTables: Array<{ tableId: string; tableName: string; revenue: number; minutes: number }>;
  tablePerformance: Array<{
    tableId: string;
    tableName: string;
    revenue: number;
    minutes: number;
    sessionsCount: number;
    averageCheck: number;
  }>;
  topProducts: Array<{ productId: string; productName: string; revenue: number; quantity: number }>;
  categorySales: Array<{
    categoryId: string;
    categoryName: string;
    revenue: number;
    quantity: number;
  }>;
  lowStockAnalytics: Array<{
    productId: string;
    productName: string;
    categoryName: string;
    stock: number;
    threshold: number;
    gap: number;
  }>;
  shiftHistory: Array<{
    shiftId: string;
    status: ShiftStatus;
    openingCash: number;
    closingCash?: number;
    revenue: number;
    cashMovementNet: number;
    expectedCash: number;
    discrepancy?: number;
    openedAt: string;
    pausedAt?: string;
    closedAt?: string;
    openedByOperatorName?: string;
    closedByOperatorName?: string;
  }>;
  chart: Array<{ label: string; revenue: number; sessions: number; occupancy: number }>;
}
