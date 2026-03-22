import { formatDateTimeLabel, formatCurrency, formatDuration } from "@/lib/utils";

export type PrintableReceiptLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  note?: string;
};

export type PrintableReceiptAdjustment = {
  label: string;
  value: string;
  reason: string;
};

export type PrintableReceipt = {
  title: string;
  clubName: string;
  documentCode: string;
  printedAt: string;
  timezone: string;
  currency: string;
  operatorName: string;
  modeLabel: string;
  tableName?: string;
  customerName?: string;
  sessionStartedAt?: string;
  sessionDurationMinutes?: number;
  gameCharge?: number;
  items: PrintableReceiptLine[];
  barTotal?: number;
  adjustments: PrintableReceiptAdjustment[];
  total: number;
  notes?: string[];
  footerNote?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createDocumentCode(prefix: string, seed?: string) {
  const raw = (seed ?? crypto.randomUUID()).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `${prefix}-${raw.slice(0, 8)}`;
}

export function buildReceiptHtml(receipt: PrintableReceipt) {
  const linesHtml = receipt.items
    .map(
      (item) => `
        <div class="receipt-line">
          <div>
            <div class="receipt-line-title">${escapeHtml(item.name)}</div>
            <span class="receipt-line-meta">${item.quantity} x ${escapeHtml(formatCurrency(item.unitPrice, receipt.currency))}</span>
            ${item.note ? `<span class="receipt-line-note">${escapeHtml(item.note)}</span>` : ""}
          </div>
          <div class="receipt-value">${escapeHtml(formatCurrency(item.total, receipt.currency))}</div>
        </div>`,
    )
    .join("");

  const adjustmentsHtml =
    receipt.adjustments.length > 0
      ? `<div class="receipt-section-title">Tuzatishlar</div>
        ${receipt.adjustments
          .map(
            (adjustment) => `
              <div class="receipt-line">
                <div>
                  <div class="receipt-line-title">${escapeHtml(adjustment.label)}</div>
                  <span class="receipt-line-note">${escapeHtml(adjustment.reason)}</span>
                </div>
                <div class="receipt-value">${escapeHtml(adjustment.value)}</div>
              </div>`,
          )
          .join("")}`
      : "";

  const notesHtml =
    receipt.notes && receipt.notes.length > 0
      ? `<div class="receipt-notes">
          <ul>${receipt.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
        </div>`
      : "";

  return `
    <main class="receipt-root">
      <div class="receipt-title">${escapeHtml(receipt.clubName)}</div>
      <div class="receipt-subtitle">${escapeHtml(receipt.title)}</div>
      <div class="receipt-subtitle">${escapeHtml(receipt.documentCode)}</div>

      <div class="receipt-rule"></div>

      <div class="receipt-meta">
        <div class="receipt-meta-row"><span class="receipt-label">Vaqt</span><span class="receipt-value">${escapeHtml(formatDateTimeLabel(receipt.printedAt, receipt.timezone))}</span></div>
        <div class="receipt-meta-row"><span class="receipt-label">Operator</span><span class="receipt-value">${escapeHtml(receipt.operatorName)}</span></div>
        <div class="receipt-meta-row"><span class="receipt-label">Mode</span><span class="receipt-value">${escapeHtml(receipt.modeLabel)}</span></div>
        ${receipt.tableName ? `<div class="receipt-meta-row"><span class="receipt-label">Stol</span><span class="receipt-value">${escapeHtml(receipt.tableName)}</span></div>` : ""}
        ${receipt.customerName ? `<div class="receipt-meta-row"><span class="receipt-label">Mijoz</span><span class="receipt-value">${escapeHtml(receipt.customerName)}</span></div>` : ""}
        ${
          receipt.sessionStartedAt
            ? `<div class="receipt-meta-row"><span class="receipt-label">Boshlanish</span><span class="receipt-value">${escapeHtml(formatDateTimeLabel(receipt.sessionStartedAt, receipt.timezone))}</span></div>`
            : ""
        }
        ${
          typeof receipt.sessionDurationMinutes === "number"
            ? `<div class="receipt-meta-row"><span class="receipt-label">Davomiylik</span><span class="receipt-value">${escapeHtml(formatDuration(receipt.sessionDurationMinutes))}</span></div>`
            : ""
        }
      </div>

      ${
        typeof receipt.gameCharge === "number"
          ? `<div class="receipt-section-title">O'yin</div>
             <div class="receipt-line">
               <div>
                 <div class="receipt-line-title">Stol vaqti</div>
                 <span class="receipt-line-meta">${escapeHtml(receipt.modeLabel)}</span>
               </div>
               <div class="receipt-value">${escapeHtml(formatCurrency(receipt.gameCharge, receipt.currency))}</div>
             </div>`
          : ""
      }

      ${
        receipt.items.length > 0
          ? `<div class="receipt-section-title">Bar / mahsulot</div>${linesHtml}`
          : ""
      }

      ${adjustmentsHtml}

      <div class="receipt-total">
        ${
          typeof receipt.barTotal === "number"
            ? `<div class="receipt-total-row"><span class="receipt-label">Bar jami</span><span>${escapeHtml(formatCurrency(receipt.barTotal, receipt.currency))}</span></div>`
            : ""
        }
        <div class="receipt-total-row receipt-grand-total">
          <span>Jami</span>
          <span>${escapeHtml(formatCurrency(receipt.total, receipt.currency))}</span>
        </div>
      </div>

      ${notesHtml}

      <div class="receipt-footer">
        ${escapeHtml(receipt.footerNote ?? "Rahmat. Chek brauzer orqali termal printerga chiqariladi.")}
      </div>
    </main>
  `;
}
