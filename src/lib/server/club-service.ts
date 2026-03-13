import { addHours, differenceInMinutes } from "date-fns";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import {
  billiardTables,
  clubSettings,
  operators,
  orderItems,
  orders,
  productCategories,
  products,
  reservations,
  stockMovements,
  tableSessions,
} from "@/lib/db/schema";
import { requireDatabase } from "@/lib/db/client";
import {
  aggregateQuantitiesByProduct,
  buildCounterSales,
  buildDashboardActivity,
  buildReport,
  calculateGameCharge,
  calculateOrderItemsTotal,
  calculateOrderTotal,
  differenceInWholeMinutes,
  getReservedStock,
  getSessionOverlapMinutes,
  hasReservationOverlap,
} from "@/lib/domain/logic";
import { getReportWindow, isSameZonedDay } from "@/lib/time";
import type {
  BootstrapPayload,
  ClubSettings,
  DashboardActivityPoint,
  OperatorSession,
  Order,
  OrderItem,
  Product,
  ProductCategory,
  RangeReport,
  ReportRange,
  Reservation,
  StockMovement,
  Table,
  TableSession,
  TableSnapshot,
  TableStatus,
  TableType,
} from "@/types/club";

type Database = ReturnType<typeof requireDatabase>;
type QueryExecutor = Pick<Database, "select">;

const RESERVED_LOOKAHEAD_HOURS = 4;

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapSettingsRow(row: typeof clubSettings.$inferSelect): ClubSettings {
  return {
    clubName: row.clubName,
    currency: row.currency,
    timezone: row.timezone,
    operatorName: row.operatorName,
    operatorEmail: row.operatorEmail,
    standardHourlyRate: row.standardHourlyRate,
    vipHourlyRate: row.vipHourlyRate,
    showActivityChart: row.showActivityChart,
    showRightRail: row.showRightRail,
  };
}

function mapTableRow(row: typeof billiardTables.$inferSelect): Table {
  return {
    id: row.id,
    name: row.name,
    type: row.type as TableType,
    position: row.position,
    accentColor: row.accentColor,
    isActive: row.isActive,
  };
}

function mapSessionRow(row: typeof tableSessions.$inferSelect): TableSession {
  return {
    id: row.id,
    tableId: row.tableId,
    customerName: row.customerName,
    note: row.note ?? undefined,
    startedAt: row.startedAt.toISOString(),
    endedAt: toIso(row.endedAt),
    hourlyRateSnapshot: row.hourlyRateSnapshot,
    status: row.status,
  };
}

function mapReservationRow(row: typeof reservations.$inferSelect): Reservation {
  return {
    id: row.id,
    tableId: row.tableId,
    customerName: row.customerName,
    phone: row.phone,
    guests: row.guests,
    note: row.note ?? undefined,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status,
    sessionId: row.sessionId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapCategoryRow(row: typeof productCategories.$inferSelect): ProductCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    position: row.position,
  };
}

function mapProductRow(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    unit: row.unit,
    price: row.price,
    costPrice: row.costPrice,
    stock: row.stock,
    threshold: row.threshold,
    isActive: row.isActive,
  };
}

function mapOrderRow(row: typeof orders.$inferSelect): Order {
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    paidAt: toIso(row.paidAt),
    note: row.note ?? undefined,
    tableId: row.tableId ?? undefined,
    sessionId: row.sessionId ?? undefined,
    customerName: row.customerName ?? undefined,
    counterSaleId: row.mode === "counter" ? `counter-${row.id}` : undefined,
  };
}

function mapOrderItemRow(row: typeof orderItems.$inferSelect): OrderItem {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
  };
}

function mapStockMovementRow(row: typeof stockMovements.$inferSelect): StockMovement {
  return {
    id: row.id,
    productId: row.productId,
    type: row.type,
    quantity: row.quantity,
    reason: row.reason,
    resultingStock: row.resultingStock,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadClubDataset(db: Database = requireDatabase()) {
  const [
    settingsRows,
    tableRows,
    sessionRows,
    reservationRows,
    categoryRows,
    productRows,
    orderRows,
    orderItemRows,
    stockMovementRows,
  ] = await Promise.all([
    db.select().from(clubSettings).limit(1),
    db.select().from(billiardTables).orderBy(asc(billiardTables.position)),
    db.select().from(tableSessions).orderBy(desc(tableSessions.startedAt)),
    db.select().from(reservations).orderBy(asc(reservations.startAt)),
    db.select().from(productCategories).orderBy(asc(productCategories.position), asc(productCategories.name)),
    db.select().from(products).orderBy(asc(products.name)),
    db.select().from(orders).orderBy(desc(orders.createdAt)),
    db.select().from(orderItems).orderBy(asc(orderItems.createdAt)),
    db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)),
  ]);

  const settingsRow = settingsRows[0];
  if (!settingsRow) {
    throw new Error("Klub sozlamalari topilmadi. Avval `pnpm db:seed` ni ishga tushiring.");
  }

  return {
    settings: mapSettingsRow(settingsRow),
    tables: tableRows.map(mapTableRow),
    sessions: sessionRows.map(mapSessionRow),
    reservations: reservationRows.map(mapReservationRow),
    categories: categoryRows.map(mapCategoryRow),
    products: productRows.map(mapProductRow),
    orders: orderRows.map(mapOrderRow),
    orderItems: orderItemRows.map(mapOrderItemRow),
    stockMovements: stockMovementRows.map(mapStockMovementRow),
  };
}

function getTableRate(type: TableType, settings: ClubSettings) {
  return type === "vip" ? settings.vipHourlyRate : settings.standardHourlyRate;
}

function deriveTableStatus(
  tableId: string,
  activeSessionId: string | undefined,
  reservationsList: Reservation[],
  now = new Date(),
): TableStatus {
  if (activeSessionId) {
    return "active";
  }

  const nearest = reservationsList.find((item) => {
    if (item.tableId !== tableId || item.status !== "scheduled") {
      return false;
    }

    const start = new Date(item.startAt).getTime();
    return start >= now.getTime() && start <= addHours(now, RESERVED_LOOKAHEAD_HOURS).getTime();
  });

  return nearest ? "reserved" : "free";
}

function getPendingOrderSummary(sessionId: string, ordersList: Order[], orderItemsList: OrderItem[]) {
  const relevantOrders = ordersList.filter(
    (order) => order.sessionId === sessionId && order.mode === "table" && order.status === "confirmed",
  );
  const pendingOrderTotal = relevantOrders.reduce(
    (sum, order) => sum + calculateOrderTotal(order.id, orderItemsList),
    0,
  );
  return { relevantOrders, pendingOrderTotal };
}

function buildTableSnapshots(
  tables: Table[],
  sessions: TableSession[],
  reservationsList: Reservation[],
  ordersList: Order[],
  orderItemsList: OrderItem[],
  settings: ClubSettings,
  now = new Date(),
): TableSnapshot[] {
  return tables
    .filter((table) => table.isActive)
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((table) => {
      const activeSession =
        sessions.find((session) => session.tableId === table.id && session.status === "active") ?? null;
      const nextReservation =
        reservationsList.find(
          (reservation) =>
            reservation.tableId === table.id &&
            reservation.status === "scheduled" &&
            new Date(reservation.endAt).getTime() > now.getTime(),
        ) ?? null;
      const { pendingOrderTotal } = activeSession
        ? getPendingOrderSummary(activeSession.id, ordersList, orderItemsList)
        : { pendingOrderTotal: 0 };
      const gameCharge = activeSession ? calculateGameCharge(activeSession, now.toISOString()) : 0;
      const currentSummary = activeSession
        ? {
            gameCharge,
            orderTotal: pendingOrderTotal,
            total: gameCharge + pendingOrderTotal,
            durationMinutes: differenceInWholeMinutes(activeSession.startedAt, now.toISOString()),
          }
        : null;

      return {
        id: table.id,
        name: table.name,
        type: table.type,
        position: table.position,
        accentColor: table.accentColor,
        status: deriveTableStatus(table.id, activeSession?.id, reservationsList, now),
        hourlyRate: getTableRate(table.type, settings),
        activeSession,
        nextReservation,
        pendingOrderTotal,
        currentSummary,
      };
    });
}

function buildDashboardKpis({
  settings,
  tables,
  sessions,
  reservationsList,
  ordersList,
  orderItemsList,
  now,
}: {
  settings: ClubSettings;
  tables: TableSnapshot[];
  sessions: TableSession[];
  reservationsList: Reservation[];
  ordersList: Order[];
  orderItemsList: OrderItem[];
  now?: Date;
}) {
  const clock = now ?? new Date();
  const dayWindow = getReportWindow("day", settings.timezone, clock);
  const occupancyWindowEnd = new Date(
    Math.min(clock.getTime(), dayWindow.endExclusive.getTime()),
  );

  const completedSessionsToday = sessions.filter(
    (session) =>
      session.status === "completed" &&
      session.endedAt &&
      isSameZonedDay(session.endedAt, clock, settings.timezone),
  );
  const paidOrdersToday = ordersList.filter((order) =>
    order.status === "paid"
      ? isSameZonedDay(order.paidAt ?? order.createdAt, clock, settings.timezone)
      : false,
  );
  const paidOrderIds = new Set(paidOrdersToday.map((order) => order.id));
  const paidItemsToday = orderItemsList.filter((item) => paidOrderIds.has(item.orderId));
  const totalRevenue =
    completedSessionsToday.reduce((sum, session) => sum + calculateGameCharge(session), 0) +
    calculateOrderItemsTotal(paidItemsToday);
  const occupiedMinutes = sessions.reduce(
    (sum, session) =>
      sum +
      getSessionOverlapMinutes(session, dayWindow.start, occupancyWindowEnd, clock.toISOString()),
    0,
  );
  const totalAvailableMinutes =
    tables.length * Math.max(differenceInMinutes(occupancyWindowEnd, dayWindow.start), 1);

  return {
    totalRevenue,
    activeTables: tables.filter((table) => table.status === "active").length,
    reservationsToday: reservationsList.filter(
      (reservation) =>
        reservation.status !== "cancelled" &&
        isSameZonedDay(reservation.startAt, clock, settings.timezone),
    ).length,
    gamesToday: completedSessionsToday.length,
    occupancyRate:
      totalAvailableMinutes > 0 ? Math.round((occupiedMinutes / totalAvailableMinutes) * 100) : 0,
    barRevenue: calculateOrderItemsTotal(paidItemsToday),
  };
}

function buildLowStockProducts(productsList: Product[], ordersList: Order[], orderItemsList: OrderItem[]) {
  return productsList.filter((product) => {
    const available = product.stock - getReservedStock(product.id, ordersList, orderItemsList);
    return available <= product.threshold;
  });
}

function assertReservationTimes(startAt: string, endAt: string) {
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw new Error("Bron yakun vaqti boshlanishdan keyin bo'lishi kerak");
  }
}

async function fetchAllOrdersAndItems(tx: QueryExecutor) {
  const [ordersRows, orderItemRows] = await Promise.all([
    tx.select().from(orders),
    tx.select().from(orderItems),
  ]);

  return {
    orders: ordersRows.map(mapOrderRow),
    orderItems: orderItemRows.map(mapOrderItemRow),
  };
}

function ensureStockAvailability(
  items: Array<{ productId: string; quantity: number }>,
  productsList: Product[],
  ordersList: Order[],
  orderItemsList: OrderItem[],
  options?: { excludeOrderIds?: Set<string> },
) {
  for (const item of items) {
    const product = productsList.find((candidate) => candidate.id === item.productId);
    if (!product) {
      throw new Error("Mahsulot topilmadi");
    }

    const reserved = getReservedStock(product.id, ordersList, orderItemsList, options);
    const available = product.stock - reserved;
    if (available < item.quantity) {
      throw new Error(`${product.name} uchun yetarli qoldiq yo'q`);
    }
  }
}

export async function getClubSettings() {
  const db = requireDatabase();
  const rows = await db.select().from(clubSettings).limit(1);
  const row = rows[0];

  if (!row) {
    throw new Error("Klub sozlamalari topilmadi. Avval `pnpm db:seed` ni ishga tushiring.");
  }

  return mapSettingsRow(row);
}

export async function getBootstrapPayload(
  operatorOverride?: OperatorSession,
): Promise<BootstrapPayload> {
  const state = await loadClubDataset();
  const now = new Date();
  const tables = buildTableSnapshots(
    state.tables,
    state.sessions,
    state.reservations,
    state.orders,
    state.orderItems,
    state.settings,
    now,
  );
  const kpis = buildDashboardKpis({
    settings: state.settings,
    tables,
    sessions: state.sessions,
    reservationsList: state.reservations,
    ordersList: state.orders,
    orderItemsList: state.orderItems,
    now,
  });

  return {
    operator:
      operatorOverride ?? {
        id: "operator",
        name: state.settings.operatorName,
        email: state.settings.operatorEmail,
        mode: "database",
      },
    settings: state.settings,
    tables,
    reservations: state.reservations,
    categories: state.categories,
    products: state.products,
    orders: state.orders,
    orderItems: state.orderItems,
    counterSales: buildCounterSales(state.orders, state.orderItems),
    stockMovements: state.stockMovements,
    kpis,
    lowStockProducts: buildLowStockProducts(state.products, state.orders, state.orderItems),
    generatedAt: now.toISOString(),
  };
}

export async function getDashboardActivity(): Promise<DashboardActivityPoint[]> {
  const state = await loadClubDataset();
  return buildDashboardActivity({
    settings: state.settings,
    tables: state.tables,
    sessions: state.sessions,
    orders: state.orders,
    orderItems: state.orderItems,
  });
}

export async function startTableSession(
  tableId: string,
  input: { customerName: string; note?: string },
) {
  const db = requireDatabase();

  await db.transaction(async (tx) => {
    const [tableRow] = await tx
      .select()
      .from(billiardTables)
      .where(eq(billiardTables.id, tableId))
      .limit(1);
    if (!tableRow) {
      throw new Error("Stol topilmadi");
    }

    const [settingsRow] = await tx.select().from(clubSettings).limit(1);
    if (!settingsRow) {
      throw new Error("Klub sozlamalari topilmadi");
    }

    const [activeSession] = await tx
      .select()
      .from(tableSessions)
      .where(and(eq(tableSessions.tableId, tableId), eq(tableSessions.status, "active")))
      .limit(1);
    if (activeSession) {
      throw new Error("Bu stol allaqachon band");
    }

    const now = new Date();
    await tx.insert(tableSessions).values({
      id: createId("session"),
      tableId,
      customerName: input.customerName,
      note: input.note,
      startedAt: now,
      hourlyRateSnapshot:
        tableRow.type === "vip" ? settingsRow.vipHourlyRate : settingsRow.standardHourlyRate,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function stopTableSession(tableId: string, input: { note?: string }) {
  const db = requireDatabase();

  await db.transaction(async (tx) => {
    const [activeSessionRow] = await tx
      .select()
      .from(tableSessions)
      .where(and(eq(tableSessions.tableId, tableId), eq(tableSessions.status, "active")))
      .limit(1);

    if (!activeSessionRow) {
      throw new Error("Faol seans topilmadi");
    }

    const confirmedOrdersRows = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.sessionId, activeSessionRow.id), eq(orders.status, "confirmed")));
    const confirmedOrderIds = confirmedOrdersRows.map((order) => order.id);
    const sessionItemsRows =
      confirmedOrderIds.length > 0
        ? await tx.select().from(orderItems).where(inArray(orderItems.orderId, confirmedOrderIds))
        : [];
    const sessionItems = sessionItemsRows.map(mapOrderItemRow);
    const requiredByProduct = aggregateQuantitiesByProduct(
      sessionItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    );
    const settledAt = new Date();

    if (Object.keys(requiredByProduct).length > 0) {
      const productRows = await tx
        .select()
        .from(products)
        .where(inArray(products.id, Object.keys(requiredByProduct)));

      for (const productRow of productRows) {
        const required = requiredByProduct[productRow.id] ?? 0;
        if (productRow.stock < required) {
          throw new Error(`${productRow.name} uchun yetarli qoldiq yo'q`);
        }
      }

      for (const productRow of productRows) {
        const quantity = requiredByProduct[productRow.id] ?? 0;
        if (!quantity) {
          continue;
        }

        const nextStock = productRow.stock - quantity;
        await tx
          .update(products)
          .set({
            stock: nextStock,
            updatedAt: settledAt,
          })
          .where(eq(products.id, productRow.id));

        await tx.insert(stockMovements).values({
          id: createId("movement"),
          productId: productRow.id,
          orderId: confirmedOrderIds[0] ?? null,
          sessionId: activeSessionRow.id,
          type: "out",
          quantity,
          reason: `${activeSessionRow.customerName} seansi`,
          resultingStock: nextStock,
          createdAt: settledAt,
        });
      }

      await tx
        .update(orders)
        .set({
          status: "paid",
          paidAt: settledAt,
          updatedAt: settledAt,
        })
        .where(inArray(orders.id, confirmedOrderIds));
    }

    await tx
      .update(tableSessions)
      .set({
        status: "completed",
        endedAt: settledAt,
        note: input.note ?? activeSessionRow.note,
        updatedAt: settledAt,
      })
      .where(eq(tableSessions.id, activeSessionRow.id));

    await tx
      .update(reservations)
      .set({
        status: "completed",
        updatedAt: settledAt,
      })
      .where(eq(reservations.sessionId, activeSessionRow.id));
  });
}

export async function createTableOrder(input: {
  tableId?: string;
  sessionId?: string;
  note?: string;
  items: Array<{ productId: string; quantity: number }>;
}) {
  const db = requireDatabase();

  await db.transaction(async (tx) => {
    const activeSessionRows = input.sessionId
      ? await tx
          .select()
          .from(tableSessions)
          .where(and(eq(tableSessions.id, input.sessionId), eq(tableSessions.status, "active")))
          .limit(1)
      : input.tableId
        ? await tx
            .select()
            .from(tableSessions)
            .where(and(eq(tableSessions.tableId, input.tableId), eq(tableSessions.status, "active")))
            .limit(1)
        : [];
    const activeSession = activeSessionRows[0];

    if (!activeSession) {
      throw new Error("Faol stol seansi topilmadi");
    }

    const [{ orders: orderRecords, orderItems: orderItemRecords }, productRows] = await Promise.all([
      fetchAllOrdersAndItems(tx),
      tx.select().from(products),
    ]);
    const productRecords = productRows.map(mapProductRow);

    ensureStockAvailability(input.items, productRecords, orderRecords, orderItemRecords);

    const existingOrderRows = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.sessionId, activeSession.id),
          eq(orders.mode, "table"),
          eq(orders.status, "confirmed"),
        ),
      )
      .limit(1);
    const now = new Date();
    const existingOrder = existingOrderRows[0];
    const orderId = existingOrder?.id ?? createId("order");

    if (!existingOrder) {
      await tx.insert(orders).values({
        id: orderId,
        mode: "table",
        status: "confirmed",
        createdAt: now,
        updatedAt: now,
        tableId: activeSession.tableId,
        sessionId: activeSession.id,
        note: input.note,
      });
    } else if (input.note) {
      await tx
        .update(orders)
        .set({
          note: input.note,
          updatedAt: now,
        })
        .where(eq(orders.id, orderId));
    }

    for (const line of input.items) {
      const product = productRecords.find((candidate) => candidate.id === line.productId);
      if (!product) {
        throw new Error("Mahsulot topilmadi");
      }

      await tx.insert(orderItems).values({
        id: createId("item"),
        orderId,
        productId: product.id,
        quantity: line.quantity,
        unitPrice: product.price,
        createdAt: now,
      });
    }
  });
}

export async function createCounterSale(input: {
  customerName?: string;
  note?: string;
  items: Array<{ productId: string; quantity: number }>;
}) {
  const db = requireDatabase();

  await db.transaction(async (tx) => {
    const [{ orders: orderRecords, orderItems: orderItemRecords }, productRows] = await Promise.all([
      fetchAllOrdersAndItems(tx),
      tx.select().from(products),
    ]);
    const productRecords = productRows.map(mapProductRow);

    ensureStockAvailability(input.items, productRecords, orderRecords, orderItemRecords);

    const orderId = createId("order");
    const createdAt = new Date();
    const requestedByProduct = aggregateQuantitiesByProduct(input.items);

    await tx.insert(orders).values({
      id: orderId,
      mode: "counter",
      status: "paid",
      createdAt,
      paidAt: createdAt,
      updatedAt: createdAt,
      note: input.note,
      customerName: input.customerName,
    });

    for (const line of input.items) {
      const product = productRecords.find((candidate) => candidate.id === line.productId);
      if (!product) {
        throw new Error("Mahsulot topilmadi");
      }

      await tx.insert(orderItems).values({
        id: createId("item"),
        orderId,
        productId: product.id,
        quantity: line.quantity,
        unitPrice: product.price,
        createdAt,
      });
    }

    for (const [productId, quantity] of Object.entries(requestedByProduct)) {
      const product = productRecords.find((candidate) => candidate.id === productId);
      if (!product) {
        throw new Error("Mahsulot topilmadi");
      }

      const nextStock = product.stock - quantity;
      await tx
        .update(products)
        .set({
          stock: nextStock,
          updatedAt: createdAt,
        })
        .where(eq(products.id, product.id));
      await tx.insert(stockMovements).values({
        id: createId("movement"),
        productId: product.id,
        orderId,
        sessionId: null,
        type: "out",
        quantity,
        reason: input.customerName ? `${input.customerName} counter savdosi` : "Counter savdosi",
        resultingStock: nextStock,
        createdAt,
      });
    }
  });
}

export async function createReservation(input: {
  tableId: string;
  customerName: string;
  phone: string;
  guests: number;
  startAt: string;
  endAt: string;
  note?: string;
}) {
  const db = requireDatabase();

  await db.transaction(async (tx) => {
    assertReservationTimes(input.startAt, input.endAt);
    const reservationRows = await tx.select().from(reservations);
    const reservationRecords = reservationRows.map(mapReservationRow);

    if (
      hasReservationOverlap(reservationRecords, {
        tableId: input.tableId,
        startAt: input.startAt,
        endAt: input.endAt,
        status: "scheduled",
      })
    ) {
      throw new Error("Tanlangan vaqt boshqa bron bilan to'qnashmoqda");
    }

    const now = new Date();
    await tx.insert(reservations).values({
      id: createId("reservation"),
      tableId: input.tableId,
      customerName: input.customerName,
      phone: input.phone,
      guests: input.guests,
      note: input.note,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function updateReservation(
  reservationId: string,
  input: {
    customerName?: string;
    phone?: string;
    guests?: number;
    startAt?: string;
    endAt?: string;
    note?: string;
    status?: Reservation["status"];
    convertToSession?: boolean;
  },
) {
  const db = requireDatabase();

  await db.transaction(async (tx) => {
    const [reservationRow] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);
    if (!reservationRow) {
      throw new Error("Bron topilmadi");
    }

    const currentReservation = mapReservationRow(reservationRow);
    const nextReservation: Reservation = {
      ...currentReservation,
      ...input,
      startAt: input.startAt ?? currentReservation.startAt,
      endAt: input.endAt ?? currentReservation.endAt,
      status: input.status ?? currentReservation.status,
    };
    assertReservationTimes(nextReservation.startAt, nextReservation.endAt);

    const reservationRows = await tx.select().from(reservations);
    const reservationRecords = reservationRows.map(mapReservationRow);
    if (
      hasReservationOverlap(
        reservationRecords,
        {
          tableId: nextReservation.tableId,
          startAt: nextReservation.startAt,
          endAt: nextReservation.endAt,
          status: nextReservation.status,
        },
        reservationId,
      )
    ) {
      throw new Error("Yangilangan bron boshqa bron bilan to'qnashmoqda");
    }

    const now = new Date();
    let sessionId = reservationRow.sessionId;

    if (input.convertToSession) {
      if (currentReservation.status === "cancelled" || currentReservation.status === "completed") {
        throw new Error("Yakunlangan yoki bekor qilingan bronni seansga aylantirib bo'lmaydi");
      }

      const [activeSession] = await tx
        .select()
        .from(tableSessions)
        .where(and(eq(tableSessions.tableId, reservationRow.tableId), eq(tableSessions.status, "active")))
        .limit(1);
      if (activeSession) {
        throw new Error("Bu stol hozir band");
      }

      const [tableRow] = await tx
        .select()
        .from(billiardTables)
        .where(eq(billiardTables.id, reservationRow.tableId))
        .limit(1);
      const [settingsRow] = await tx.select().from(clubSettings).limit(1);
      if (!tableRow || !settingsRow) {
        throw new Error("Stol yoki klub sozlamalari topilmadi");
      }

      sessionId = createId("session");
      await tx.insert(tableSessions).values({
        id: sessionId,
        tableId: reservationRow.tableId,
        customerName: input.customerName ?? reservationRow.customerName,
        note: input.note ?? reservationRow.note,
        startedAt: now,
        hourlyRateSnapshot:
          tableRow.type === "vip" ? settingsRow.vipHourlyRate : settingsRow.standardHourlyRate,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      nextReservation.status = "arrived";
    }

    await tx
      .update(reservations)
      .set({
        customerName: input.customerName ?? reservationRow.customerName,
        phone: input.phone ?? reservationRow.phone,
        guests: input.guests ?? reservationRow.guests,
        startAt: new Date(nextReservation.startAt),
        endAt: new Date(nextReservation.endAt),
        note: input.note ?? reservationRow.note,
        status: nextReservation.status,
        sessionId,
        updatedAt: now,
      })
      .where(eq(reservations.id, reservationId));
  });
}

export async function getReport(range: ReportRange): Promise<RangeReport> {
  const state = await loadClubDataset();
  return buildReport({
    range,
    settings: state.settings,
    tables: state.tables,
    sessions: state.sessions,
    orders: state.orders,
    orderItems: state.orderItems,
    products: state.products,
  });
}

export async function updateSettings(input: {
  clubName?: string;
  currency?: string;
  timezone?: string;
  operatorName?: string;
  operatorEmail?: string;
  standardHourlyRate?: number;
  vipHourlyRate?: number;
  showActivityChart?: boolean;
  showRightRail?: boolean;
  tables?: Array<{ id: string; name: string; type: "standard" | "vip" }>;
}) {
  const db = requireDatabase();

  await db.transaction(async (tx) => {
    const now = new Date();
    const [settingsRow] = await tx.select().from(clubSettings).limit(1);
    if (!settingsRow) {
      throw new Error("Klub sozlamalari topilmadi");
    }

    await tx
      .update(clubSettings)
      .set({
        clubName: input.clubName ?? settingsRow.clubName,
        currency: input.currency ?? settingsRow.currency,
        timezone: input.timezone ?? settingsRow.timezone,
        operatorName: input.operatorName ?? settingsRow.operatorName,
        operatorEmail: input.operatorEmail ?? settingsRow.operatorEmail,
        standardHourlyRate: input.standardHourlyRate ?? settingsRow.standardHourlyRate,
        vipHourlyRate: input.vipHourlyRate ?? settingsRow.vipHourlyRate,
        showActivityChart: input.showActivityChart ?? settingsRow.showActivityChart,
        showRightRail: input.showRightRail ?? settingsRow.showRightRail,
        updatedAt: now,
      })
      .where(eq(clubSettings.id, settingsRow.id));

    if (input.tables) {
      for (const table of input.tables) {
        await tx
          .update(billiardTables)
          .set({
            name: table.name,
            type: table.type,
            updatedAt: now,
          })
          .where(eq(billiardTables.id, table.id));
      }
    }

    if (input.operatorName || input.operatorEmail) {
      const [primaryOperator] = await tx
        .select()
        .from(operators)
        .orderBy(asc(operators.createdAt))
        .limit(1);

      if (primaryOperator) {
        await tx
          .update(operators)
          .set({
            fullName: input.operatorName ?? primaryOperator.fullName,
            email: (input.operatorEmail ?? primaryOperator.email).trim().toLowerCase(),
            updatedAt: now,
          })
          .where(eq(operators.id, primaryOperator.id));
      }
    }
  });
}

export async function updateInventory(
  input:
    | {
        action: "product";
        productId: string;
        name?: string;
        price?: number;
        costPrice?: number;
        stock?: number;
        threshold?: number;
        isActive?: boolean;
      }
    | {
        action: "stock";
        productId: string;
        type: "in" | "out" | "correction";
        quantity: number;
        reason: string;
      },
) {
  const db = requireDatabase();

  await db.transaction(async (tx) => {
    const [productRow] = await tx
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);
    if (!productRow) {
      throw new Error("Mahsulot topilmadi");
    }

    const now = new Date();

    if (input.action === "product") {
      await tx
        .update(products)
        .set({
          name: input.name ?? productRow.name,
          price: input.price ?? productRow.price,
          costPrice: input.costPrice ?? productRow.costPrice,
          stock: input.stock ?? productRow.stock,
          threshold: input.threshold ?? productRow.threshold,
          isActive: input.isActive ?? productRow.isActive,
          updatedAt: now,
        })
        .where(eq(products.id, productRow.id));
      return;
    }

    if (input.type === "out") {
      const { orders: orderRecords, orderItems: orderItemRecords } = await fetchAllOrdersAndItems(tx);
      const reserved = getReservedStock(productRow.id, orderRecords, orderItemRecords);
      const available = productRow.stock - reserved;
      if (available < input.quantity) {
        throw new Error("Qoldiq yetarli emas");
      }
    }

    const nextStock =
      input.type === "in"
        ? productRow.stock + input.quantity
        : input.type === "out"
          ? productRow.stock - input.quantity
          : input.quantity;

    await tx
      .update(products)
      .set({
        stock: nextStock,
        updatedAt: now,
      })
      .where(eq(products.id, productRow.id));

    await tx.insert(stockMovements).values({
      id: createId("movement"),
      productId: productRow.id,
      orderId: null,
      sessionId: null,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
      resultingStock: nextStock,
      createdAt: now,
    });
  });
}
