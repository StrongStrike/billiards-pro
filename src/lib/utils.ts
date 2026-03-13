import { formatInTimeZone } from "date-fns-tz";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { DEFAULT_TIMEZONE, ensureTimeZone } from "@/lib/time";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "UZS") {
  return (
    new Intl.NumberFormat("uz-UZ", {
      maximumFractionDigits: 0,
    }).format(value) + ` ${currency}`
  );
}

export function formatClock(iso: string, timeZone = DEFAULT_TIMEZONE) {
  return formatInTimeZone(iso, ensureTimeZone(timeZone), "HH:mm");
}

export function formatDateLabel(iso: string, timeZone = DEFAULT_TIMEZONE) {
  return formatInTimeZone(iso, ensureTimeZone(timeZone), "dd MMM yyyy");
}

export function formatDateTimeLabel(iso: string, timeZone = DEFAULT_TIMEZONE) {
  return formatInTimeZone(iso, ensureTimeZone(timeZone), "dd MMM, HH:mm");
}

export function formatDuration(minutes: number) {
  const safeMinutes = Math.max(minutes, 0);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatRelativeDay(iso: string, timeZone = DEFAULT_TIMEZONE) {
  const zone = ensureTimeZone(timeZone);
  const target = formatInTimeZone(iso, zone, "yyyy-MM-dd");
  const today = formatInTimeZone(new Date(), zone, "yyyy-MM-dd");
  return target === today ? "Bugun" : formatInTimeZone(iso, zone, "dd MMM");
}

export function toCsv(
  rows: Array<Record<string, string | number>>,
  columns: Array<{ key: string; label: string }>,
) {
  const header = columns.map((column) => column.label).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = row[column.key] ?? "";
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");

  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
