import { addMinutes, differenceInMinutes } from "date-fns";

import { getDashboardBuckets, getReportChartBuckets, getReportWindow } from "@/lib/time";
import type {
  BillAdjustment,
  CashMovement,
  ClubSettings,
  OperatorSummary,
  CounterSale,
  DashboardActivityPoint,
  Order,
  OrderItem,
  Product,
  ProductCategory,
  RangeReport,
  ReportRange,
  Reservation,
  Shift,
  Table,
  TableSession,
} from "@/types/club";

export function differenceInWholeMinutes(startIso: string, endIso: string) {
  const diff = Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  return Math.max(diff, 0);
}

export function getSessionEnd(session: TableSession, fallbackIso = new Date().toISOString()) {
  return session.endedAt ?? fallbackIso;
}

export function getSessionOverlapMinutes(
  session: TableSession,
  start: Date,
  endExclusive: Date,
  fallbackIso = new Date().toISOString(),
) {
  const sessionStart = new Date(session.startedAt).getTime();
  const sessionEnd = new Date(getSessionEnd(session, fallbackIso)).getTime();
  const overlapStart = Math.max(sessionStart, start.getTime());
  const overlapEnd = Math.min(sessionEnd, endExclusive.getTime());

  if (overlapEnd <= overlapStart) {
    return 0;
  }

  return Math.floor((overlapEnd - overlapStart) / 60000);
}

export function calculateGameCharge(
  session: TableSession,
  endIso = new Date().toISOString(),
) {
  const durationMinutes = differenceInWholeMinutes(session.startedAt, session.endedAt ?? endIso);
  return Math.round((session.hourlyRateSnapshot * durationMinutes) / 60);
}

export function getSessionBillAdjustments(sessionId: string, billAdjustments: BillAdjustment[]) {
  return billAdjustments.filter((adjustment) => adjustment.sessionId === sessionId);
}

export function summarizeBillAdjustments(adjustments: BillAdjustment[]) {
  return adjustments.reduce(
    (summary, adjustment) => {
      const amount = adjustment.amount ?? 0;
      if (adjustment.type === "manual_charge") {
        summary.adjustmentAmount += amount;
      }
      return summary;
    },
    { adjustmentAmount: 0 },
  );
}

export function calculateSessionSummary(
  session: TableSession,
  orderTotal: number,
  adjustments: BillAdjustment[],
  endIso = new Date().toISOString(),
) {
  const durationMinutes = differenceInWholeMinutes(session.startedAt, session.endedAt ?? endIso);
  const { adjustmentAmount } = summarizeBillAdjustments(adjustments);
  const baseGameCharge = calculateGameCharge(session, endIso);
  const gameCharge = calculateGameCharge(session, endIso);
  const rawTotal = gameCharge + orderTotal + adjustmentAmount;

  return {
    baseGameCharge,
    gameCharge,
    orderTotal,
    adjustmentAmount,
    total: Math.max(rawTotal, 0),
    durationMinutes,
  };
}

export function getCashMovementSignedAmount(movement: Pick<CashMovement, "type" | "amount">) {
  if (movement.type === "service_out" || movement.type === "expense" || movement.type === "cash_drop") {
    return -movement.amount;
  }

  return movement.amount;
}

function sumSessionOrderTotal(sessionId: string, orders: Order[], orderItems: OrderItem[]) {
  const sessionOrderIds = new Set(
    orders.filter((order) => order.sessionId === sessionId && order.status === "paid").map((order) => order.id),
  );

  return calculateOrderItemsTotal(orderItems.filter((item) => sessionOrderIds.has(item.orderId)));
}

function sumCompletedSessionRevenue(
  sessions: TableSession[],
  orders: Order[],
  orderItems: OrderItem[],
  billAdjustments: BillAdjustment[],
) {
  return sessions.reduce((sum, session) => {
    const sessionAdjustments = getSessionBillAdjustments(session.id, billAdjustments);
    const sessionOrderTotal = sumSessionOrderTotal(session.id, orders, orderItems);
    return sum + calculateSessionSummary(session, sessionOrderTotal, sessionAdjustments, session.endedAt).total;
  }, 0);
}

function shiftOverlapsWindow(shift: Shift, start: Date, endExclusive: Date, now: Date) {
  const openedAt = new Date(shift.openedAt).getTime();
  const shiftEnd = new Date(shift.closedAt ?? now.toISOString()).getTime();
  return openedAt < endExclusive.getTime() && shiftEnd > start.getTime();
}

export function calculateOrderItemsTotal(items: Array<{ quantity: number; unitPrice: number }>) {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function calculateOrderTotal(orderId: string, orderItems: OrderItem[]) {
  return calculateOrderItemsTotal(orderItems.filter((item) => item.orderId === orderId));
}

export function getReservedStock(
  productId: string,
  orders: Order[],
  orderItems: OrderItem[],
  options?: { excludeOrderIds?: Set<string> },
) {
  const excluded = options?.excludeOrderIds ?? new Set<string>();
  const confirmedOrderIds = new Set(
    orders
      .filter(
        (order) =>
          order.status === "confirmed" &&
          order.mode === "table" &&
          !excluded.has(order.id),
      )
      .map((order) => order.id),
  );

  return orderItems
    .filter((item) => item.productId === productId && confirmedOrderIds.has(item.orderId))
    .reduce((sum, item) => sum + item.quantity, 0);
}

export function aggregateQuantitiesByProduct(
  items: Array<{ productId: string; quantity: number }>,
) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.productId] = (accumulator[item.productId] ?? 0) + item.quantity;
    return accumulator;
  }, {});
}

export function hasReservationOverlap(
  reservations: Reservation[],
  candidate: Pick<Reservation, "tableId" | "startAt" | "endAt" | "status">,
  ignoreReservationId?: string,
) {
  if (candidate.status === "cancelled") {
    return false;
  }

  const candidateStart = new Date(candidate.startAt).getTime();
  const candidateEnd = new Date(candidate.endAt).getTime();

  return reservations.some((reservation) => {
    if (reservation.id === ignoreReservationId) {
      return false;
    }

    if (reservation.tableId !== candidate.tableId || reservation.status === "cancelled") {
      return false;
    }

    const reservationStart = new Date(reservation.startAt).getTime();
    const reservationEnd = new Date(reservation.endAt).getTime();
    return candidateStart < reservationEnd && candidateEnd > reservationStart;
  });
}

export function buildCounterSales(orders: Order[], orderItems: OrderItem[]): CounterSale[] {
  return orders
    .filter((order) => order.mode === "counter" && order.status === "paid")
    .map((order) => ({
      id: order.counterSaleId ?? `counter-${order.id}`,
      orderId: order.id,
      customerName: order.customerName,
      createdAt: order.paidAt ?? order.createdAt,
      total: calculateOrderTotal(order.id, orderItems),
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function buildDashboardActivity({
  settings,
  tables,
  sessions,
  orders,
  orderItems,
  billAdjustments,
  now,
}: {
  settings: ClubSettings;
  tables: Table[];
  sessions: TableSession[];
  orders: Order[];
  orderItems: OrderItem[];
  billAdjustments: BillAdjustment[];
  now?: Date;
}): DashboardActivityPoint[] {
  const buckets = getDashboardBuckets(settings.timezone, now);

  return buckets.map((bucket) => {
    const bucketSessions = sessions.filter((session) => {
      const sessionEnd = new Date(getSessionEnd(session, bucket.endExclusive.toISOString())).getTime();
      return (
        new Date(session.startedAt).getTime() < bucket.endExclusive.getTime() &&
        sessionEnd > bucket.start.getTime()
      );
    });
    const sessionMinutes = bucketSessions.reduce(
      (sum, session) =>
        sum + getSessionOverlapMinutes(session, bucket.start, bucket.endExclusive, bucket.endExclusive.toISOString()),
      0,
    );
    const completedSessionRevenue = sessions
      .filter(
        (session) =>
          session.status === "completed" &&
          session.endedAt &&
          new Date(session.endedAt).getTime() >= bucket.start.getTime() &&
          new Date(session.endedAt).getTime() < bucket.endExclusive.getTime(),
      )
      .reduce((sum, session) => {
        const sessionAdjustments = getSessionBillAdjustments(session.id, billAdjustments);
        return sum + calculateSessionSummary(session, 0, sessionAdjustments, session.endedAt).gameCharge + summarizeBillAdjustments(sessionAdjustments).adjustmentAmount;
      }, 0);
    const paidOrders = orders.filter((order) => {
      const stamp = order.paidAt ?? order.createdAt;
      return (
        order.status === "paid" &&
        new Date(stamp).getTime() >= bucket.start.getTime() &&
        new Date(stamp).getTime() < bucket.endExclusive.getTime()
      );
    });
    const paidOrderIds = new Set(paidOrders.map((order) => order.id));
    const paidRevenue = calculateOrderItemsTotal(
      orderItems.filter((item) => paidOrderIds.has(item.orderId)),
    );

    return {
      label: bucket.label,
      occupancy:
        tables.length > 0 && bucket.durationMinutes > 0
          ? Math.min(
              100,
              Math.round((sessionMinutes / (tables.length * bucket.durationMinutes)) * 100),
            )
          : 0,
      revenue: completedSessionRevenue + paidRevenue,
    };
  });
}

export function buildReport({
  range,
  settings,
  now,
  tables,
  sessions,
  orders,
  orderItems,
  products,
  categories,
  cashMovements,
  billAdjustments,
  shifts,
  operators,
}: {
  range: ReportRange;
  settings: ClubSettings;
  now?: Date;
  tables: Table[];
  sessions: TableSession[];
  orders: Order[];
  orderItems: OrderItem[];
  products: Product[];
  categories: ProductCategory[];
  cashMovements: CashMovement[];
  billAdjustments: BillAdjustment[];
  shifts: Shift[];
  operators: OperatorSummary[];
}): RangeReport {
  const clock = now ?? new Date();
  const window = getReportWindow(range, settings.timezone, clock);

  const relevantSessions = sessions.filter((session) => {
    if (session.status !== "completed" || !session.endedAt) {
      return false;
    }

    const endedAt = new Date(session.endedAt).getTime();
    return endedAt >= window.start.getTime() && endedAt < window.endExclusive.getTime();
  });

  const relevantOrders = orders.filter((order) => {
    const stamp = new Date(order.paidAt ?? order.createdAt).getTime();
    return (
      order.status === "paid" &&
      stamp >= window.start.getTime() &&
      stamp < window.endExclusive.getTime()
    );
  });
  const relevantOrderIds = new Set(relevantOrders.map((order) => order.id));
  const relevantItems = orderItems.filter((item) => relevantOrderIds.has(item.orderId));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const operatorById = new Map(operators.map((operator) => [operator.id, operator]));

  const adjustmentsTotal = relevantSessions.reduce(
    (sum, session) => sum + summarizeBillAdjustments(getSessionBillAdjustments(session.id, billAdjustments)).adjustmentAmount,
    0,
  );
  const gameRevenue = relevantSessions.reduce(
    (sum, session) =>
      sum +
      calculateSessionSummary(
        session,
        0,
        getSessionBillAdjustments(session.id, billAdjustments),
        session.endedAt,
      ).gameCharge,
    0,
  );
  const barRevenue = calculateOrderItemsTotal(relevantItems);
  const playMinutes = sessions.reduce(
    (sum, session) =>
      sum + getSessionOverlapMinutes(session, window.start, window.endExclusive, clock.toISOString()),
    0,
  );
  const totalAvailableMinutes =
    tables.filter((table) => table.isActive).length *
    Math.max(differenceInMinutes(window.endExclusive, window.start), 0);
  const occupancyRate =
    totalAvailableMinutes > 0 ? Math.round((playMinutes / totalAvailableMinutes) * 100) : 0;

  const topTables = tables
    .map((table) => {
      const tableSessions = relevantSessions.filter((session) => session.tableId === table.id);
      const sessionsCount = tableSessions.length;
      return {
        tableId: table.id,
        tableName: table.name,
        revenue: tableSessions.reduce((sum, session) => {
          const summary = calculateSessionSummary(
            session,
            calculateOrderItemsTotal(
              relevantItems.filter((item) =>
                relevantOrders.some((order) => order.id === item.orderId && order.sessionId === session.id),
              ),
            ),
            getSessionBillAdjustments(session.id, billAdjustments),
            session.endedAt,
          );
          return sum + summary.total;
        }, 0),
        minutes: tableSessions.reduce(
          (sum, session) => sum + differenceInWholeMinutes(session.startedAt, session.endedAt!),
          0,
        ),
        sessionsCount,
        averageCheck:
          sessionsCount > 0
            ? Math.round(
                tableSessions.reduce((sum, session) => {
                  const summary = calculateSessionSummary(
                    session,
                    calculateOrderItemsTotal(
                      relevantItems.filter((item) =>
                        relevantOrders.some((order) => order.id === item.orderId && order.sessionId === session.id),
                      ),
                    ),
                    getSessionBillAdjustments(session.id, billAdjustments),
                    session.endedAt,
                  );
                  return sum + summary.total;
                }, 0) / sessionsCount,
              )
            : 0,
      };
    })
    .filter((table) => table.revenue > 0 || table.minutes > 0)
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5);

  const tablePerformance = tables
    .map((table) => {
      const tableSessions = relevantSessions.filter((session) => session.tableId === table.id);
      const revenue = tableSessions.reduce((sum, session) => {
        const sessionSummary = calculateSessionSummary(
          session,
          sumSessionOrderTotal(session.id, relevantOrders, relevantItems),
          getSessionBillAdjustments(session.id, billAdjustments),
          session.endedAt,
        );
        return sum + sessionSummary.total;
      }, 0);
      const minutes = tableSessions.reduce(
        (sum, session) => sum + differenceInWholeMinutes(session.startedAt, session.endedAt!),
        0,
      );
      const sessionsCount = tableSessions.length;

      return {
        tableId: table.id,
        tableName: table.name,
        revenue,
        minutes,
        sessionsCount,
        averageCheck: sessionsCount > 0 ? Math.round(revenue / sessionsCount) : 0,
      };
    })
    .filter((table) => table.revenue > 0 || table.minutes > 0)
    .sort((left, right) => right.revenue - left.revenue);

  const topProducts = products
    .map((product) => {
      const productItems = relevantItems.filter((item) => item.productId === product.id);
      return {
        productId: product.id,
        productName: product.name,
        revenue: calculateOrderItemsTotal(productItems),
        quantity: productItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    })
    .filter((product) => product.quantity > 0)
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5);

  const categorySales = categories
    .map((category) => {
      const categoryProductIds = new Set(
        products.filter((product) => product.categoryId === category.id).map((product) => product.id),
      );
      const categoryItems = relevantItems.filter((item) => categoryProductIds.has(item.productId));
      return {
        categoryId: category.id,
        categoryName: category.name,
        revenue: calculateOrderItemsTotal(categoryItems),
        quantity: categoryItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    })
    .filter((category) => category.quantity > 0)
    .sort((left, right) => right.revenue - left.revenue);

  const lowStockAnalytics = products
    .filter((product) => product.isActive && product.stock <= product.threshold)
    .map((product) => ({
      productId: product.id,
      productName: product.name,
      categoryName: categoryById.get(product.categoryId)?.name ?? "Kategoriya",
      stock: product.stock,
      threshold: product.threshold,
      gap: Math.max(product.threshold - product.stock, 0),
    }))
    .sort((left, right) => right.gap - left.gap || left.stock - right.stock);

  const shiftHistory = shifts
    .filter((shift) => shiftOverlapsWindow(shift, window.start, window.endExclusive, clock))
    .map((shift) => {
      const shiftStart = new Date(shift.openedAt);
      const shiftEnd = new Date(shift.closedAt ?? clock.toISOString());
      const shiftSessions = sessions.filter((session) => {
        if (session.status !== "completed" || !session.endedAt) {
          return false;
        }

        const endedAt = new Date(session.endedAt).getTime();
        return endedAt >= shiftStart.getTime() && endedAt < shiftEnd.getTime();
      });
      const shiftOrders = orders.filter((order) => {
        if (order.status !== "paid") {
          return false;
        }

        const stamp = new Date(order.paidAt ?? order.createdAt).getTime();
        return stamp >= shiftStart.getTime() && stamp < shiftEnd.getTime();
      });
      const shiftOrderIds = new Set(shiftOrders.map((order) => order.id));
      const shiftItems = orderItems.filter((item) => shiftOrderIds.has(item.orderId));
      const shiftRevenue =
        sumCompletedSessionRevenue(shiftSessions, shiftOrders, shiftItems, billAdjustments) +
        calculateOrderItemsTotal(
          shiftItems.filter(
            (item) => !shiftOrders.some((order) => order.id === item.orderId && order.sessionId),
          ),
        );
      const shiftCashMovementNet = cashMovements
        .filter((movement) => {
          const createdAt = new Date(movement.createdAt).getTime();
          return createdAt >= shiftStart.getTime() && createdAt < shiftEnd.getTime();
        })
        .reduce((sum, movement) => sum + getCashMovementSignedAmount(movement), 0);
      const expectedCash = shift.openingCash + shiftRevenue + shiftCashMovementNet;
      const discrepancy =
        typeof shift.closingCash === "number" ? shift.closingCash - expectedCash : undefined;

      return {
        shiftId: shift.id,
        status: shift.status,
        openingCash: shift.openingCash,
        closingCash: shift.closingCash,
        revenue: shiftRevenue,
        cashMovementNet: shiftCashMovementNet,
        expectedCash,
        discrepancy,
        openedAt: shift.openedAt,
        pausedAt: shift.pausedAt,
        closedAt: shift.closedAt,
        openedByOperatorName: shift.openedByOperatorId
          ? operatorById.get(shift.openedByOperatorId)?.name
          : undefined,
        closedByOperatorName: shift.closedByOperatorId
          ? operatorById.get(shift.closedByOperatorId)?.name
          : undefined,
      };
    })
    .sort((left, right) => new Date(right.openedAt).getTime() - new Date(left.openedAt).getTime());

  const cashDiscrepancyTotal = shiftHistory.reduce(
    (sum, shift) => sum + (typeof shift.discrepancy === "number" ? shift.discrepancy : 0),
    0,
  );

  const chart = getReportChartBuckets(range, settings.timezone, clock).map((bucket) => {
    const bucketSessions = sessions.filter((session) => {
      if (session.status !== "completed" || !session.endedAt) {
        return false;
      }

      const endedAt = new Date(session.endedAt).getTime();
      return endedAt >= bucket.start.getTime() && endedAt < bucket.endExclusive.getTime();
    });
    const bucketOrders = relevantOrders.filter((order) => {
      const stamp = new Date(order.paidAt ?? order.createdAt).getTime();
      return stamp >= bucket.start.getTime() && stamp < bucket.endExclusive.getTime();
    });
    const bucketOrderIds = new Set(bucketOrders.map((order) => order.id));
    const revenue =
      bucketSessions.reduce((sum, session) => {
        const bucketItems = orderItems.filter((item) => bucketOrderIds.has(item.orderId));
        const sessionOrderIds = new Set(
          bucketOrders.filter((order) => order.sessionId === session.id).map((order) => order.id),
        );
        const sessionOrderTotal = calculateOrderItemsTotal(
          bucketItems.filter((item) => sessionOrderIds.has(item.orderId)),
        );
        const summary = calculateSessionSummary(
          session,
          sessionOrderTotal,
          getSessionBillAdjustments(session.id, billAdjustments),
          session.endedAt,
        );
        return sum + summary.total;
      }, 0) +
      calculateOrderItemsTotal(
        orderItems.filter(
          (item) =>
            bucketOrderIds.has(item.orderId) &&
            !bucketOrders.some((order) => order.id === item.orderId && order.sessionId),
        ),
      );
    const occupiedMinutes = sessions.reduce(
      (sum, session) =>
        sum + getSessionOverlapMinutes(session, bucket.start, bucket.endExclusive, clock.toISOString()),
      0,
    );

    return {
      label: bucket.label,
      revenue,
      sessions: bucketSessions.length,
      occupancy:
        tables.length > 0 && bucket.durationMinutes > 0
          ? Math.round((occupiedMinutes / (tables.length * bucket.durationMinutes)) * 100)
          : 0,
    };
  });

  return {
    range,
    label: window.label,
    revenue: gameRevenue + barRevenue + adjustmentsTotal,
    gameRevenue,
    barRevenue,
    adjustmentsTotal,
    sessionsCount: relevantSessions.length,
    occupancyRate,
    playMinutes,
    currency: settings.currency,
    timezone: settings.timezone,
    periodStart: window.start.toISOString(),
    periodEnd: addMinutes(window.endExclusive, -1).toISOString(),
    cashDiscrepancyTotal,
    topTables,
    tablePerformance,
    topProducts,
    categorySales,
    lowStockAnalytics,
    shiftHistory,
    chart,
  };
}
