import "dotenv/config";

import { hashPassword } from "@/lib/auth/password";
import { requireDatabase } from "@/lib/db/client";
import {
  auditLogs,
  billAdjustments,
  billiardTables,
  cashMovements,
  clubSettings,
  operators,
  orderItems,
  orders,
  productCategories,
  products,
  reservations,
  shiftEvents,
  shifts,
  stockMovements,
  tableSessions,
} from "@/lib/db/schema";
import { createSeedDataset } from "@/lib/db/seed";

const seedAdmin = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@billiards.uz",
  password: process.env.SEED_ADMIN_PASSWORD ?? "BilliardsPro2026!",
  name: process.env.SEED_ADMIN_NAME ?? "Aziz Manager",
};

const seedCashier = {
  email: process.env.SEED_CASHIER_EMAIL ?? "kassir@billiards.uz",
  password: process.env.SEED_CASHIER_PASSWORD ?? "Kassir2026!",
  name: process.env.SEED_CASHIER_NAME ?? "Timur Kassir",
};

async function seedDatabase() {
  const db = requireDatabase();
  const dataset = createSeedDataset();
  const now = new Date();
  const normalizedAdminEmail = seedAdmin.email.trim().toLowerCase();

  await db.transaction(async (tx) => {
    await tx.delete(auditLogs);
    await tx.delete(shiftEvents);
    await tx.delete(billAdjustments);
    await tx.delete(cashMovements);
    await tx.delete(shifts);
    await tx.delete(stockMovements);
    await tx.delete(orderItems);
    await tx.delete(orders);
    await tx.delete(reservations);
    await tx.delete(tableSessions);
    await tx.delete(products);
    await tx.delete(productCategories);
    await tx.delete(billiardTables);
    await tx.delete(clubSettings);
    await tx.delete(operators);

    await tx.insert(clubSettings).values({
      id: "club",
      ...dataset.settings,
      operatorName: seedAdmin.name,
      operatorEmail: normalizedAdminEmail,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(operators).values({
      id: "operator-admin",
      fullName: seedAdmin.name,
      email: normalizedAdminEmail,
      passwordHash: hashPassword(seedAdmin.password),
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(operators).values({
      id: "operator-cashier",
      fullName: seedCashier.name,
      email: seedCashier.email.trim().toLowerCase(),
      passwordHash: hashPassword(seedCashier.password),
      role: "cashier",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(billiardTables).values(
      dataset.tables.map((table) => ({
        ...table,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await tx.insert(productCategories).values(
      dataset.categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        position: category.position ?? 0,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await tx.insert(products).values(
      dataset.products.map((product) => ({
        ...product,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await tx.insert(tableSessions).values(
      dataset.sessions.map((session) => ({
        ...session,
        note: session.note ?? null,
        startedAt: new Date(session.startedAt),
        endedAt: session.endedAt ? new Date(session.endedAt) : null,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await tx.insert(reservations).values(
      dataset.reservations.map((reservation) => ({
        id: reservation.id,
        tableId: reservation.tableId,
        sessionId: reservation.sessionId ?? null,
        customerName: reservation.customerName,
        phone: reservation.phone,
        guests: reservation.guests,
        note: reservation.note ?? null,
        startAt: new Date(reservation.startAt),
        endAt: new Date(reservation.endAt),
        status: reservation.status,
        createdAt: reservation.createdAt ? new Date(reservation.createdAt) : now,
        updatedAt: now,
      })),
    );

    await tx.insert(orders).values(
      dataset.orders.map((order) => ({
        id: order.id,
        mode: order.mode,
        status: order.status,
        note: order.note ?? null,
        tableId: order.tableId ?? null,
        sessionId: order.sessionId ?? null,
        customerName: order.customerName ?? null,
        createdAt: new Date(order.createdAt),
        paidAt: order.paidAt ? new Date(order.paidAt) : null,
        updatedAt: now,
      })),
    );

    await tx.insert(orderItems).values(
      dataset.orderItems.map((item) => ({
        ...item,
        createdAt: now,
      })),
    );

    await tx.insert(stockMovements).values(
      dataset.stockMovements.map((movement) => ({
        ...movement,
        orderId: null,
        sessionId: null,
        createdAt: new Date(movement.createdAt),
      })),
    );

    await tx.insert(shifts).values(
      dataset.shifts.map((shift) => ({
        id: shift.id,
        status: shift.status,
        openingCash: shift.openingCash,
        closingCash: shift.closingCash ?? null,
        openedByOperatorId: shift.openedByOperatorId ?? "operator-admin",
        closedByOperatorId: shift.closedByOperatorId ?? null,
        note: shift.note ?? null,
        openedAt: new Date(shift.openedAt),
        pausedAt: shift.pausedAt ? new Date(shift.pausedAt) : null,
        closedAt: shift.closedAt ? new Date(shift.closedAt) : null,
        updatedAt: new Date(shift.updatedAt),
      })),
    );

    await tx.insert(shiftEvents).values(
      dataset.shiftEvents.map((event) => ({
        id: event.id,
        shiftId: event.shiftId,
        operatorId:
          event.operatorId === "operator-cashier" ? "operator-cashier" : "operator-admin",
        type: event.type,
        note: event.note ?? null,
        createdAt: new Date(event.createdAt),
      })),
    );

    await tx.insert(cashMovements).values(
      dataset.cashMovements.map((movement) => ({
        ...movement,
        operatorId: movement.shiftId === "shift-0" ? "operator-cashier" : "operator-admin",
        shiftId: movement.shiftId ?? null,
        createdAt: new Date(movement.createdAt),
      })),
    );

    await tx.insert(billAdjustments).values(
      dataset.billAdjustments.map((adjustment) => ({
        ...adjustment,
        operatorId: adjustment.shiftId === "shift-0" ? "operator-cashier" : "operator-admin",
        shiftId: adjustment.shiftId ?? null,
        amount: adjustment.amount ?? null,
        createdAt: new Date(adjustment.createdAt),
      })),
    );

    await tx.insert(auditLogs).values(
      dataset.auditLogs.map((log) => ({
        id: log.id,
        operatorId: log.operatorId === "operator-cashier" ? "operator-cashier" : "operator-admin",
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId ?? null,
        description: log.description,
        metadata: log.metadata ?? null,
        createdAt: new Date(log.createdAt),
      })),
    );
  });
}

async function main() {
  await seedDatabase();
  console.log("Postgres seed tayyor");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
