"use client";

import { openPrintDocument } from "@/lib/print";
import type { RangeReport } from "@/types/club";
import { formatCurrency, formatDateTimeLabel, formatDuration } from "@/lib/utils";

const REPORT_PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 12mm;
  }

  body {
    background: #ffffff;
    font-size: 12px;
  }

  .report-root {
    max-width: 190mm;
    margin: 0 auto;
  }

  .report-title {
    font-size: 24px;
    font-weight: 800;
    margin-bottom: 4px;
  }

  .report-subtitle {
    color: #475569;
    margin-bottom: 16px;
  }

  .report-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .report-card {
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    padding: 10px 12px;
  }

  .report-card-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #64748b;
  }

  .report-card-value {
    margin-top: 6px;
    font-size: 18px;
    font-weight: 800;
  }

  .report-section {
    margin-top: 18px;
  }

  .report-section-title {
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    border: 1px solid #cbd5e1;
    padding: 7px 8px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #e2e8f0;
    font-size: 11px;
  }

  .report-muted {
    color: #64748b;
  }
`;

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildTable(headers: string[], rows: Array<Array<string | number>>) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildReportHtml(report: RangeReport) {
  const summaryCards = [
    ["Davr", report.label],
    ["Jami tushum", formatCurrency(report.revenue, report.currency)],
    ["O'yin tushumi", formatCurrency(report.gameRevenue, report.currency)],
    ["Bar tushumi", formatCurrency(report.barRevenue, report.currency)],
    ["Billing tuzatish", formatCurrency(report.adjustmentsTotal, report.currency)],
    ["Bandlik", `${report.occupancyRate}%`],
  ];

  return `
    <div class="report-root">
      <div class="report-title">Billiards Pro hisobot</div>
      <div class="report-subtitle">
        ${escapeHtml(report.label)} | ${escapeHtml(formatDateTimeLabel(report.periodStart, report.timezone))} - ${escapeHtml(formatDateTimeLabel(report.periodEnd, report.timezone))}
      </div>

      <div class="report-grid">
        ${summaryCards
          .map(
            ([label, value]) => `
              <div class="report-card">
                <div class="report-card-label">${escapeHtml(label)}</div>
                <div class="report-card-value">${escapeHtml(value)}</div>
              </div>`,
          )
          .join("")}
      </div>

      <div class="report-section">
        <div class="report-section-title">Stollar bo'yicha</div>
        ${buildTable(
          ["Stol", "Tushum", "Band vaqt", "Seanslar", "O'rtacha chek"],
          report.tablePerformance.map((table) => [
            table.tableName,
            formatCurrency(table.revenue, report.currency),
            formatDuration(table.minutes),
            table.sessionsCount,
            formatCurrency(table.averageCheck, report.currency),
          ]),
        )}
      </div>

      <div class="report-section">
        <div class="report-section-title">Kategoriyalar bo'yicha savdo</div>
        ${buildTable(
          ["Kategoriya", "Sotildi", "Tushum"],
          report.categorySales.map((category) => [
            category.categoryName,
            `${category.quantity} dona`,
            formatCurrency(category.revenue, report.currency),
          ]),
        )}
      </div>

      <div class="report-section">
        <div class="report-section-title">Smena tarixi</div>
        ${buildTable(
          ["Smena", "Holat", "Ochilgan", "Yopilgan", "Tushum", "Kassa tafovuti"],
          report.shiftHistory.map((shift) => [
            shift.shiftId,
            shift.status === "paused" ? "Pauza" : shift.status === "open" ? "Faol" : "Yopilgan",
            formatDateTimeLabel(shift.openedAt, report.timezone),
            shift.closedAt ? formatDateTimeLabel(shift.closedAt, report.timezone) : "Ochiq",
            formatCurrency(shift.revenue, report.currency),
            typeof shift.discrepancy === "number" ? formatCurrency(shift.discrepancy, report.currency) : "Yakunlanmagan",
          ]),
        )}
      </div>
    </div>
  `;
}

export function downloadExcelReport(report: RangeReport) {
  const html = `<!doctype html><html><head><meta charset="utf-8" /><style>${REPORT_PRINT_STYLES}</style></head><body>${buildReportHtml(report)}</body></html>`;
  downloadBlob(
    `hisobot-${report.range}.xls`,
    new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }),
  );
}

export function printReportPdf(report: RangeReport) {
  openPrintDocument({
    title: `${report.label} PDF`,
    bodyHtml: buildReportHtml(report),
    styles: REPORT_PRINT_STYLES,
  });
}
