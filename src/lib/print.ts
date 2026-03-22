"use client";

type PrintDocumentOptions = {
  title: string;
  bodyHtml: string;
};

const PRINT_STYLES = `
  :root {
    color-scheme: light;
    font-family: "Segoe UI", Arial, sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  @page {
    size: 80mm auto;
    margin: 6mm;
  }

  body {
    margin: 0;
    background: #ffffff;
    color: #050b14;
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 12px;
    line-height: 1.45;
  }

  .receipt-root {
    width: 68mm;
    margin: 0 auto;
  }

  .receipt-title {
    font-size: 19px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: 0.02em;
    text-align: center;
  }

  .receipt-subtitle {
    margin-top: 4px;
    font-size: 11px;
    color: #475569;
    text-align: center;
  }

  .receipt-rule {
    margin: 12px 0;
    border-top: 1px dashed #94a3b8;
  }

  .receipt-meta {
    display: grid;
    gap: 5px;
    margin: 10px 0 0;
  }

  .receipt-meta-row,
  .receipt-line,
  .receipt-total-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .receipt-label {
    color: #475569;
  }

  .receipt-value {
    text-align: right;
    font-weight: 600;
  }

  .receipt-section-title {
    margin: 14px 0 8px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .receipt-line {
    padding: 4px 0;
    border-bottom: 1px dotted rgba(148, 163, 184, 0.4);
  }

  .receipt-line:last-child {
    border-bottom: 0;
  }

  .receipt-line-title {
    font-weight: 700;
  }

  .receipt-line-note {
    display: block;
    margin-top: 2px;
    color: #64748b;
    font-size: 11px;
  }

  .receipt-line-meta {
    color: #64748b;
    font-size: 11px;
  }

  .receipt-total {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 2px solid #050b14;
  }

  .receipt-total-row {
    font-size: 12px;
    font-weight: 700;
  }

  .receipt-grand-total {
    margin-top: 8px;
    font-size: 17px;
    font-weight: 900;
    letter-spacing: 0.02em;
  }

  .receipt-notes {
    margin-top: 12px;
    padding: 9px 10px;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    border-radius: 8px;
  }

  .receipt-notes ul {
    margin: 0;
    padding-left: 18px;
  }

  .receipt-notes li + li {
    margin-top: 4px;
  }

  .receipt-footer {
    margin-top: 14px;
    color: #475569;
    text-align: center;
    font-size: 11px;
  }
`;

export function openPrintDocument({ title, bodyHtml }: PrintDocumentOptions) {
  if (typeof window === "undefined") {
    throw new Error("Print faqat brauzer ichida ishlaydi");
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  const html = `<!doctype html>
<html lang="uz">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;

  let printStarted = false;
  let cleanupScheduled = false;

  const cleanup = () => {
    iframe.onload = null;
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  const scheduleCleanup = (delay = 150) => {
    if (cleanupScheduled) {
      return;
    }
    cleanupScheduled = true;
    window.setTimeout(cleanup, delay);
  };

  const startPrint = () => {
    if (printStarted) {
      return;
    }

    const printWindow = iframe.contentWindow;
    const iframeDocument = iframe.contentDocument;
    if (!printWindow || !iframeDocument) {
      scheduleCleanup();
      return;
    }

    if (iframeDocument.title !== title) {
      return;
    }

    printStarted = true;

    const afterPrint = () => {
      printWindow.removeEventListener("afterprint", afterPrint);
      scheduleCleanup();
    };

    printWindow.addEventListener("afterprint", afterPrint);

    window.setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        scheduleCleanup();
      }
    }, 80);

    window.setTimeout(() => scheduleCleanup(0), 60000);
  };

  iframe.onload = startPrint;

  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}
