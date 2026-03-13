import "dotenv/config";

import { hashPassword } from "@/lib/auth/password";
import { requireDatabase } from "@/lib/db/client";
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
import { createSeedDataset } from "@/lib/db/seed";

const seedAdmin = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@billiards.uz",
  password: process.env.SEED_ADMIN_PASSWORD ?? "BilliardsPro2026!",
  name: process.env.SEED_ADMIN_NAME ?? "Aziz Manager",
};

async function seedDatabase() {
  const db = requireDatabase();
  const dataset = createSeedDataset();
  const now = new Date();
  const normalizedAdminEmail = seedAdmin.email.trim().toLowerCase();

  await db.transaction(async (tx) => {
    await tx.delete(operators);
    await tx.delete(stockMovements);
    await tx.delete(orderItems);
    await tx.delete(orders);
    await tx.delete(reservations);
    await tx.delete(tableSessions);
    await tx.delete(products);
    await tx.delete(productCategories);
    await tx.delete(billiardTables);
    await tx.delete(clubSettings);

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
