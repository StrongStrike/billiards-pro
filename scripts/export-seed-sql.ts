import "dotenv/config";

import { hashPassword } from "@/lib/auth/password";
import { createSeedDataset } from "@/lib/db/seed";

function sqlString(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${value.replace(/'/g, "''")}'`;
}

function sqlBool(value: boolean) {
  return value ? "true" : "false";
}

function sqlInt(value: number) {
  return String(value);
}

function sqlTimestamp(value: string | null | undefined) {
  if (!value) {
    return "NULL";
  }

  return `${sqlString(value)}::timestamptz`;
}

function row(values: string[]) {
  return `(${values.join(", ")})`;
}

function rowsSql(lines: string[]) {
  return lines.join(",\n");
}

async function main() {
  const dataset = createSeedDataset();
  const now = new Date().toISOString();
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@billiards.uz").trim().toLowerCase();
  const adminName = process.env.SEED_ADMIN_NAME ?? "Aziz Manager";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "BilliardsPro2026!";
  const passwordHash = hashPassword(adminPassword);

  const output = [
    "BEGIN;",
    "",
    "DELETE FROM operators;",
    "DELETE FROM stock_movements;",
    "DELETE FROM order_items;",
    "DELETE FROM orders;",
    "DELETE FROM reservations;",
    "DELETE FROM table_sessions;",
    "DELETE FROM products;",
    "DELETE FROM product_categories;",
    "DELETE FROM billiard_tables;",
    "DELETE FROM club_settings;",
    "",
    `INSERT INTO club_settings (id, club_name, currency, timezone, operator_name, operator_email, standard_hourly_rate, vip_hourly_rate, show_activity_chart, show_right_rail, created_at, updated_at) VALUES`,
    row([
      sqlString("club"),
      sqlString(dataset.settings.clubName),
      sqlString(dataset.settings.currency),
      sqlString(dataset.settings.timezone),
      sqlString(adminName),
      sqlString(adminEmail),
      sqlInt(dataset.settings.standardHourlyRate),
      sqlInt(dataset.settings.vipHourlyRate),
      sqlBool(dataset.settings.showActivityChart),
      sqlBool(dataset.settings.showRightRail),
      sqlTimestamp(now),
      sqlTimestamp(now),
    ]) + ";",
    "",
    `INSERT INTO operators (id, full_name, email, password_hash, is_active, created_at, updated_at) VALUES`,
    row([
      sqlString("operator-admin"),
      sqlString(adminName),
      sqlString(adminEmail),
      sqlString(passwordHash),
      "true",
      sqlTimestamp(now),
      sqlTimestamp(now),
    ]) + ";",
    "",
    `INSERT INTO billiard_tables (id, name, type, position, accent_color, is_active, created_at, updated_at) VALUES`,
    rowsSql(
      dataset.tables.map((table) =>
        row([
          sqlString(table.id),
          sqlString(table.name),
          sqlString(table.type),
          sqlInt(table.position),
          sqlString(table.accentColor),
          sqlBool(table.isActive),
          sqlTimestamp(now),
          sqlTimestamp(now),
        ]),
      ),
    ) + ";",
    "",
    `INSERT INTO product_categories (id, name, description, position, created_at, updated_at) VALUES`,
    rowsSql(
      dataset.categories.map((category) =>
        row([
          sqlString(category.id),
          sqlString(category.name),
          sqlString(category.description ?? null),
          sqlInt(category.position ?? 0),
          sqlTimestamp(now),
          sqlTimestamp(now),
        ]),
      ),
    ) + ";",
    "",
    `INSERT INTO products (id, category_id, name, unit, price, cost_price, stock, threshold, is_active, created_at, updated_at) VALUES`,
    rowsSql(
      dataset.products.map((product) =>
        row([
          sqlString(product.id),
          sqlString(product.categoryId),
          sqlString(product.name),
          sqlString(product.unit),
          sqlInt(product.price),
          sqlInt(product.costPrice),
          sqlInt(product.stock),
          sqlInt(product.threshold),
          sqlBool(product.isActive),
          sqlTimestamp(now),
          sqlTimestamp(now),
        ]),
      ),
    ) + ";",
    "",
    `INSERT INTO table_sessions (id, table_id, customer_name, note, started_at, ended_at, hourly_rate_snapshot, status, created_at, updated_at) VALUES`,
    rowsSql(
      dataset.sessions.map((session) =>
        row([
          sqlString(session.id),
          sqlString(session.tableId),
          sqlString(session.customerName),
          sqlString(session.note ?? null),
          sqlTimestamp(session.startedAt),
          sqlTimestamp(session.endedAt ?? null),
          sqlInt(session.hourlyRateSnapshot),
          sqlString(session.status),
          sqlTimestamp(now),
          sqlTimestamp(now),
        ]),
      ),
    ) + ";",
    "",
    `INSERT INTO reservations (id, table_id, session_id, customer_name, phone, guests, note, start_at, end_at, status, created_at, updated_at) VALUES`,
    rowsSql(
      dataset.reservations.map((reservation) =>
        row([
          sqlString(reservation.id),
          sqlString(reservation.tableId),
          sqlString(reservation.sessionId ?? null),
          sqlString(reservation.customerName),
          sqlString(reservation.phone),
          sqlInt(reservation.guests),
          sqlString(reservation.note ?? null),
          sqlTimestamp(reservation.startAt),
          sqlTimestamp(reservation.endAt),
          sqlString(reservation.status),
          sqlTimestamp(reservation.createdAt ?? now),
          sqlTimestamp(now),
        ]),
      ),
    ) + ";",
    "",
    `INSERT INTO orders (id, mode, status, note, table_id, session_id, customer_name, created_at, paid_at, updated_at) VALUES`,
    rowsSql(
      dataset.orders.map((order) =>
        row([
          sqlString(order.id),
          sqlString(order.mode),
          sqlString(order.status),
          sqlString(order.note ?? null),
          sqlString(order.tableId ?? null),
          sqlString(order.sessionId ?? null),
          sqlString(order.customerName ?? null),
          sqlTimestamp(order.createdAt),
          sqlTimestamp(order.paidAt ?? null),
          sqlTimestamp(now),
        ]),
      ),
    ) + ";",
    "",
    `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, created_at) VALUES`,
    rowsSql(
      dataset.orderItems.map((item) =>
        row([
          sqlString(item.id),
          sqlString(item.orderId),
          sqlString(item.productId),
          sqlInt(item.quantity),
          sqlInt(item.unitPrice),
          sqlTimestamp(now),
        ]),
      ),
    ) + ";",
    "",
    `INSERT INTO stock_movements (id, product_id, order_id, session_id, type, quantity, reason, resulting_stock, created_at) VALUES`,
    rowsSql(
      dataset.stockMovements.map((movement) =>
        row([
          sqlString(movement.id),
          sqlString(movement.productId),
          "NULL",
          "NULL",
          sqlString(movement.type),
          sqlInt(movement.quantity),
          sqlString(movement.reason),
          sqlInt(movement.resultingStock),
          sqlTimestamp(movement.createdAt),
        ]),
      ),
    ) + ";",
    "",
    "COMMIT;",
    "",
  ].join("\n");

  process.stdout.write(output);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
