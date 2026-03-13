import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type {
  OrderMode,
  OrderStatus,
  ReservationStatus,
  SessionStatus,
  StockMovementType,
  TableType,
} from "@/types/club";

export const tableTypeEnum = pgEnum("table_type", ["standard", "vip"]);
export const sessionStatusEnum = pgEnum("session_status", ["active", "completed"]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "scheduled",
  "arrived",
  "completed",
  "cancelled",
]);
export const orderModeEnum = pgEnum("order_mode", ["table", "counter"]);
export const orderStatusEnum = pgEnum("order_status", ["confirmed", "paid", "cancelled"]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", ["in", "out", "correction"]);

export const operators = pgTable("operators", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clubSettings = pgTable("club_settings", {
  id: text("id").primaryKey().$defaultFn(() => "club"),
  clubName: text("club_name").notNull(),
  currency: text("currency").notNull(),
  timezone: text("timezone").notNull(),
  operatorName: text("operator_name").notNull(),
  operatorEmail: text("operator_email").notNull(),
  standardHourlyRate: integer("standard_hourly_rate").notNull(),
  vipHourlyRate: integer("vip_hourly_rate").notNull(),
  showActivityChart: boolean("show_activity_chart").notNull().default(true),
  showRightRail: boolean("show_right_rail").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const billiardTables = pgTable("billiard_tables", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: tableTypeEnum("type").$type<TableType>().notNull(),
  position: integer("position").notNull(),
  accentColor: text("accent_color").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tableSessions = pgTable("table_sessions", {
  id: text("id").primaryKey(),
  tableId: text("table_id")
    .notNull()
    .references(() => billiardTables.id, { onDelete: "restrict" }),
  customerName: text("customer_name").notNull(),
  note: text("note"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  hourlyRateSnapshot: integer("hourly_rate_snapshot").notNull(),
  status: sessionStatusEnum("status").$type<SessionStatus>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reservations = pgTable("reservations", {
  id: text("id").primaryKey(),
  tableId: text("table_id")
    .notNull()
    .references(() => billiardTables.id, { onDelete: "restrict" }),
  sessionId: text("session_id").references(() => tableSessions.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  guests: integer("guests").notNull(),
  note: text("note"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  status: reservationStatusEnum("status").$type<ReservationStatus>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productCategories = pgTable("product_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  categoryId: text("category_id")
    .notNull()
    .references(() => productCategories.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  price: integer("price").notNull(),
  costPrice: integer("cost_price").notNull(),
  stock: integer("stock").notNull(),
  threshold: integer("threshold").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  mode: orderModeEnum("mode").$type<OrderMode>().notNull(),
  status: orderStatusEnum("status").$type<OrderStatus>().notNull(),
  note: text("note"),
  tableId: text("table_id").references(() => billiardTables.id, { onDelete: "set null" }),
  sessionId: text("session_id").references(() => tableSessions.id, { onDelete: "set null" }),
  customerName: text("customer_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
  sessionId: text("session_id").references(() => tableSessions.id, { onDelete: "set null" }),
  type: stockMovementTypeEnum("type").$type<StockMovementType>().notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason").notNull(),
  resultingStock: integer("resulting_stock").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const billiardTablesRelations = relations(billiardTables, ({ many }) => ({
  sessions: many(tableSessions),
  reservations: many(reservations),
  orders: many(orders),
}));

export const tableSessionsRelations = relations(tableSessions, ({ one, many }) => ({
  table: one(billiardTables, {
    fields: [tableSessions.tableId],
    references: [billiardTables.id],
  }),
  reservationLinks: many(reservations),
  orders: many(orders),
  stockMovements: many(stockMovements),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  table: one(billiardTables, {
    fields: [reservations.tableId],
    references: [billiardTables.id],
  }),
  session: one(tableSessions, {
    fields: [reservations.sessionId],
    references: [tableSessions.id],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  orderItems: many(orderItems),
  stockMovements: many(stockMovements),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  table: one(billiardTables, {
    fields: [orders.tableId],
    references: [billiardTables.id],
  }),
  session: one(tableSessions, {
    fields: [orders.sessionId],
    references: [tableSessions.id],
  }),
  items: many(orderItems),
  stockMovements: many(stockMovements),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  order: one(orders, {
    fields: [stockMovements.orderId],
    references: [orders.id],
  }),
  session: one(tableSessions, {
    fields: [stockMovements.sessionId],
    references: [tableSessions.id],
  }),
}));
