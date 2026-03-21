import {
  addDays,
  addHours,
  addMonths,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import type { ReportRange } from "@/types/club";

export const DEFAULT_TIMEZONE = "Asia/Tashkent";

export function ensureTimeZone(timeZone?: string) {
  return timeZone?.trim() || DEFAULT_TIMEZONE;
}

export function getNowInTimeZone(timeZone: string, now = new Date()) {
  return toZonedTime(now, ensureTimeZone(timeZone));
}

export function fromLocalDateTime(value: string, timeZone: string) {
  return fromZonedTime(value, ensureTimeZone(timeZone)).toISOString();
}

export function toLocalDateTimeInput(iso: string, timeZone: string) {
  return formatInTimeZone(iso, ensureTimeZone(timeZone), "yyyy-MM-dd'T'HH:mm");
}

export function isSameZonedDay(leftIso: string, right: Date, timeZone: string) {
  const zone = ensureTimeZone(timeZone);
  return (
    formatInTimeZone(leftIso, zone, "yyyy-MM-dd") ===
    formatInTimeZone(right, zone, "yyyy-MM-dd")
  );
}

export function getReportWindow(range: ReportRange, timeZone: string, now = new Date()) {
  const zone = ensureTimeZone(timeZone);
  const zonedNow = toZonedTime(now, zone);

  if (range === "month") {
    const zonedStart = startOfMonth(zonedNow);
    const zonedEndExclusive = addDays(endOfMonth(zonedNow), 1);
    return {
      range,
      label: "Oylik hisobot",
      start: fromZonedTime(zonedStart, zone),
      endExclusive: fromZonedTime(zonedEndExclusive, zone),
      zonedStart,
      zonedEndExclusive,
      timezone: zone,
    };
  }

  if (range === "week") {
    const zonedStart = startOfWeek(zonedNow, { weekStartsOn: 1 });
    const zonedEndExclusive = addDays(endOfWeek(zonedNow, { weekStartsOn: 1 }), 1);
    return {
      range,
      label: "Haftalik hisobot",
      start: fromZonedTime(zonedStart, zone),
      endExclusive: fromZonedTime(zonedEndExclusive, zone),
      zonedStart,
      zonedEndExclusive,
      timezone: zone,
    };
  }

  if (range === "year") {
    const zonedStart = startOfYear(zonedNow);
    const zonedEndExclusive = addDays(endOfYear(zonedNow), 1);
    return {
      range,
      label: "Yillik hisobot",
      start: fromZonedTime(zonedStart, zone),
      endExclusive: fromZonedTime(zonedEndExclusive, zone),
      zonedStart,
      zonedEndExclusive,
      timezone: zone,
    };
  }

  const zonedStart = startOfDay(zonedNow);
  const zonedEndExclusive = addDays(zonedStart, 1);
  return {
    range,
    label: "Kunlik hisobot",
    start: fromZonedTime(zonedStart, zone),
    endExclusive: fromZonedTime(zonedEndExclusive, zone),
    zonedStart,
    zonedEndExclusive,
    timezone: zone,
  };
}

export function getDashboardBuckets(timeZone: string, now = new Date()) {
  const zone = ensureTimeZone(timeZone);
  const zonedNow = toZonedTime(now, zone);
  const zonedEnd = addHours(startOfHour(zonedNow), 1);

  return Array.from({ length: 6 }, (_, index) => {
    const zonedStart = addHours(zonedEnd, (index - 6) * 2);
    const zonedEndExclusive = addHours(zonedStart, 2);
    return {
      label: formatInTimeZone(fromZonedTime(zonedStart, zone), zone, "HH:mm"),
      start: fromZonedTime(zonedStart, zone),
      endExclusive: fromZonedTime(zonedEndExclusive, zone),
      durationMinutes: differenceInMinutes(zonedEndExclusive, zonedStart),
    };
  });
}

export function getReportChartBuckets(range: ReportRange, timeZone: string, now = new Date()) {
  const window = getReportWindow(range, timeZone, now);

  if (range === "year") {
    return Array.from({ length: 12 }, (_, index) => {
      const zonedStart = addMonths(window.zonedStart, index);
      const zonedEndExclusive = addMonths(zonedStart, 1);
      return {
        label: formatInTimeZone(fromZonedTime(zonedStart, timeZone), timeZone, "MMM"),
        start: fromZonedTime(zonedStart, timeZone),
        endExclusive: fromZonedTime(zonedEndExclusive, timeZone),
        durationMinutes: differenceInMinutes(zonedEndExclusive, zonedStart),
      };
    });
  }

  if (range === "month") {
    const totalDays = differenceInMinutes(window.zonedEndExclusive, window.zonedStart) / (24 * 60);
    return Array.from({ length: totalDays }, (_, index) => {
      const zonedStart = addDays(window.zonedStart, index);
      const zonedEndExclusive = addDays(zonedStart, 1);
      return {
        label: formatInTimeZone(fromZonedTime(zonedStart, timeZone), timeZone, "dd MMM"),
        start: fromZonedTime(zonedStart, timeZone),
        endExclusive: fromZonedTime(zonedEndExclusive, timeZone),
        durationMinutes: 24 * 60,
      };
    });
  }

  if (range === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const zonedStart = addDays(window.zonedStart, index);
      const zonedEndExclusive = addDays(zonedStart, 1);
      return {
        label: formatInTimeZone(fromZonedTime(zonedStart, timeZone), timeZone, "dd MMM"),
        start: fromZonedTime(zonedStart, timeZone),
        endExclusive: fromZonedTime(zonedEndExclusive, timeZone),
        durationMinutes: 24 * 60,
      };
    });
  }

  return Array.from({ length: 24 }, (_, index) => {
    const zonedStart = addHours(window.zonedStart, index);
    const zonedEndExclusive = addHours(zonedStart, 1);
    return {
      label: formatInTimeZone(fromZonedTime(zonedStart, timeZone), timeZone, "HH:mm"),
      start: fromZonedTime(zonedStart, timeZone),
      endExclusive: fromZonedTime(zonedEndExclusive, timeZone),
      durationMinutes: 60,
    };
  });
}
