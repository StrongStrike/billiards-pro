import { describe, expect, it } from "vitest";

import {
  buildDashboardActivity,
  buildReport,
  calculateGameCharge,
  getReservedStock,
  hasReservationOverlap,
} from "@/lib/domain/logic";
import { createSeedDataset } from "@/lib/db/seed";

describe("club domain logic", () => {
  it("calculates per-minute session billing", () => {
    const startedAt = "2026-03-13T10:00:00.000Z";
    const endedAt = "2026-03-13T11:30:00.000Z";

    expect(
      calculateGameCharge({
        id: "session",
        tableId: "table-1",
        customerName: "Jamshid",
        startedAt,
        endedAt,
        hourlyRateSnapshot: 120000,
        status: "completed",
      }),
    ).toBe(180000);
  });

  it("detects reservation overlaps on the same table", () => {
    const reservations = [
      {
        id: "reservation-1",
        tableId: "table-1",
        customerName: "Ali",
        phone: "+998 90 000 00 00",
        guests: 4,
        startAt: "2026-03-13T14:00:00.000Z",
        endAt: "2026-03-13T15:00:00.000Z",
        status: "scheduled" as const,
      },
    ];

    expect(
      hasReservationOverlap(reservations, {
        tableId: "table-1",
        startAt: "2026-03-13T14:30:00.000Z",
        endAt: "2026-03-13T15:30:00.000Z",
        status: "scheduled",
      }),
    ).toBe(true);
  });

  it("can exclude current session reservations from reserved stock calculations", () => {
    const state = createSeedDataset(new Date("2026-03-13T12:00:00.000Z"));
    const currentOrderIds = new Set(["order-1"]);

    expect(getReservedStock("product-cola", state.orders, state.orderItems)).toBe(2);
    expect(
      getReservedStock("product-cola", state.orders, state.orderItems, {
        excludeOrderIds: currentOrderIds,
      }),
    ).toBe(0);
  });

  it("builds a timezone-aware range report with daily chart points", () => {
    const state = createSeedDataset(new Date("2026-03-13T22:00:00.000Z"));
    const report = buildReport({
      range: "day",
      now: new Date("2026-03-13T22:00:00.000Z"),
      settings: state.settings,
      tables: state.tables,
      sessions: state.sessions,
      orders: state.orders,
      orderItems: state.orderItems,
      products: state.products,
    });

    expect(report.revenue).toBeGreaterThan(0);
    expect(report.chart.length).toBe(24);
    expect(report.currency).toBe("UZS");
  });

  it("builds dashboard activity from persisted sessions and orders", () => {
    const state = createSeedDataset(new Date("2026-03-13T22:00:00.000Z"));
    const chart = buildDashboardActivity({
      settings: state.settings,
      tables: state.tables,
      sessions: state.sessions,
      orders: state.orders,
      orderItems: state.orderItems,
      now: new Date("2026-03-13T22:00:00.000Z"),
    });

    expect(chart).toHaveLength(6);
    expect(chart.some((point) => point.occupancy > 0)).toBe(true);
  });
});
