// src/utils/printLiquidationFormPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";
import QRCode from "qrcode";

/* ------------ ORG + Verify ------------- */
const ORG_TITLE = "KOLEHIYO NG PANTUKAN";
const ORG_SUBTITLE = "Juan A. Sarenas Campus, Kingking, Pantukan, Davao de Oro";
const VERIFY_BASE = "https://osas.knp.edu.ph/verify-liquidation?id=";

/* ------------ Helpers ------------- */
const fmtDate = (d) => (d ? dayjs(d).format("MMMM DD, YYYY") : "—");
const num = (v, d = 2) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });

const safeParse = (v, fallback) => {
  if (Array.isArray(v) || (v && typeof v === "object")) return v;
  try {
    const parsed = JSON.parse(v || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const baseUrl = import.meta?.env?.BASE_URL || "/";
const LOGO_URL = `${baseUrl}images/logo.png`;
const BANNER_URL = `${baseUrl}images/bg.jpg`;

async function toDataUrl(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function statusColors(statusUpper) {
  switch (statusUpper) {
    case "APPROVED":
      return [32, 141, 85];
    case "PENDING":
      return [240, 158, 47];
    case "REJECTED":
      return [220, 53, 69];
    case "CANCELLED":
      return [107, 114, 128];
    case "COMPLETED":
      return [37, 99, 235];
    default:
      return [90, 90, 90];
  }
}

/* ---------------- Header (banner) ---------------- */
async function drawHeader(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const headerH = 110;
  const marginX = 36;

  const banner = await toDataUrl(BANNER_URL);
  if (banner) {
    doc.addImage(banner, "JPEG", 0, 0, pageW, headerH, undefined, "FAST");
    doc.setGState(new doc.GState({ opacity: 0.18 }));
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageW, headerH, "F");
    doc.setGState(new doc.GState({ opacity: 1 }));
  } else {
    doc.setFillColor(21, 62, 121);
    doc.rect(0, 0, pageW, headerH, "F");
  }

  const logo = await toDataUrl(LOGO_URL);
  if (logo) doc.addImage(logo, "PNG", marginX, 20, 70, 70, undefined, "FAST");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(ORG_TITLE, marginX + 86, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(ORG_SUBTITLE, marginX + 86, 58);

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("LIQUIDATION FUND", pageW / 2, headerH + 24, { align: "center" });

  return headerH + 34;
}

/* ----- Status & Verify row (Status + QR) ----- */
async function drawStatusAndVerifyRow(doc, lf, startY) {
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 36;

  const idOrRef = lf?.id ?? lf?.reference_code ?? "";
  const verifyUrl = `${VERIFY_BASE}${encodeURIComponent(String(idOrRef))}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 0,
    width: 75,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const statusUpper = String(lf.status || "").toUpperCase();
  const [sr, sg, sb] = statusColors(statusUpper);

  const issued = lf.approved_at
    ? fmtDate(lf.approved_at)
    : lf.date_filed
    ? fmtDate(lf.date_filed)
    : "—";
  const displayUrl = `osas.knp.edu.ph/verify-liquidation?id=${String(idOrRef)}`;

  autoTable(doc, {
    startY,
    theme: "plain",
    styles: { cellPadding: 0, fontSize: 9 },
    bodyStyles: { minCellHeight: 120 },
    margin: { left: marginX, right: marginX },
    tableWidth: pageW - marginX * 2,
    body: [[{ content: "" }, { content: "" }]],
    columnStyles: {
      0: { cellWidth: pageW - marginX * 2 - 260 }, // left
      1: { cellWidth: 260 }, // right
    },
    didDrawCell: (data) => {
      if (data.section !== "body") return;
      const { x, y, width, height } = data.cell;
      const pad = 10;

      if (data.column.index === 0) {
        // LEFT card
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, width - 1, height, 6, 6, "F");

        // Status pill
        const pillH = 24;
        const pillW = Math.min(180, width - 22);
        doc.setFillColor(sr, sg, sb);
        doc.roundedRect(x + pad, y + pad, pillW, pillH, 12, 12, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(statusUpper || "STATUS", x + pad + 10, y + pad + 16);

        // Meta
        doc.setTextColor(20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        let metaY = y + pad + pillH + 16;
        doc.text(`Ref No.: ${lf.reference_code || "—"}`, x + pad, metaY);
        metaY += 16;
        doc.text(`Date Filed: ${fmtDate(lf.date_filed)}`, x + pad, metaY);
        metaY += 16;
        doc.text(`Date Issued: ${issued}`, x + pad, metaY);

        doc.setDrawColor(230);
        doc.roundedRect(x, y, width - 1, height, 6, 6, "S");
      }

      if (data.column.index === 1) {
        // RIGHT card
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, width - 1, height, 6, 6, "F");

        // Header band
        doc.setFillColor(66, 103, 178);
        doc.roundedRect(x, y, width - 1, 22, 6, 6, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("VERIFY", x + pad, y + 15);

        // QR
        const qrX = x + pad;
        const qrY = y + 28;
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, 75, 75, undefined, "FAST");

        // Text
        doc.setTextColor(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Scan to verify", qrX + 100, qrY + 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("This document can be verified", qrX + 100, qrY + 32);
        doc.text("online via the OSAS portal.", qrX + 100, qrY + 46);

        // Short URL
        doc.setTextColor(110);
        doc.setFontSize(8);
        doc.text(displayUrl, qrX + 100, qrY + 72);

        doc.setDrawColor(230);
        doc.roundedRect(x, y, width - 1, height, 6, 6, "S");
      }
    },
  });

  return doc.lastAutoTable.finalY;
}

/* --------------- Main Export --------------- */
async function buildLiquidationFormPdfDoc(lf) {
  const doc = new jsPDF({
    unit: "pt",
    format: [612, 936],
    orientation: "landscape",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 36;

  // Normalize JSON-ish fields
  const sources = safeParse(lf.sources_of_fund, {});
  const uses = safeParse(lf.uses_of_fund, []);

  // Header + Status/Verify row
  let cursorY = await drawHeader(doc);
  cursorY = (await drawStatusAndVerifyRow(doc, lf, cursorY)) + 10;

  /* -------- LINKED ACTIVITY -------- */
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "LINKED ACTIVITY",
          styles: {
            fillColor: [66, 103, 178],
            textColor: 255,
            fontStyle: "bold",
            halign: "left",
            valign: "middle",
            cellPadding: 6,
          },
        },
      ],
    ],
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY;

  const ad = lf.activity_design || {};
  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: 20,
      fontStyle: "bold",
    },
    body: [
      [
        {
          content: "NAME OF ACTIVITY",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        ad.name_of_activity || "—",
      ],
      [
        {
          content: "DATE OF IMPLEMENTATION",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        fmtDate(ad.date_of_implementation),
      ],
      [
        {
          content: "SEMESTER",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        ad.semester || "—",
      ],
      [
        {
          content: "SCHOOL YEAR",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        ad.school_year || "—",
      ],
      [
        {
          content: "OFFICE/DEPARTMENT",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        ad.office_department || ad?.club?.name || "—",
      ],
    ],
    columnStyles: {
      0: { cellWidth: 200, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY + 10;

  /* -------- SUMMARY TOTALS -------- */
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "SUMMARY",
          styles: {
            fillColor: [66, 103, 178],
            textColor: 255,
            fontStyle: "bold",
            cellPadding: 6,
          },
        },
      ],
    ],
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 8 },
    body: [
      ["Total Sources", num(lf.total_sources_amount, 2)],
      ["Total Uses", num(lf.total_uses_amount, 2)],
      ["Total Cash on Hand", num(lf.total_cash_on_hand, 2)],
    ],
    columnStyles: {
      0: { cellWidth: 220, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY + 10;

  /* -------- SOURCES OF FUND -------- */
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "SOURCES OF FUND",
          styles: {
            fillColor: [66, 103, 178],
            textColor: 255,
            fontStyle: "bold",
            cellPadding: 6,
          },
        },
      ],
    ],
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY;

  const srcRows = [
    ["Contribution", sources.contribution],
    ["Payment from Fines", sources.payment_from_fines],
    ["Solicitations", sources.solicitations],
    ["Donations", sources.donations],
    ["Other Sources", sources.other_sources],
    ["Current Available Funds", sources.current_available_funds],
  ];
  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: 20,
      fontStyle: "bold",
    },
    head: [["PARTICULAR", "AMOUNT"]],
    body: srcRows.map(([k, v]) => [k, num(v, 2)]),
    columnStyles: {
      0: { cellWidth: 320 },
      1: { cellWidth: "auto", halign: "right" },
    },
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY;

  // Other sources note (optional)
  if (sources?.other_sources_note) {
    autoTable(doc, {
      startY: cursorY,
      theme: "plain",
      styles: { fontSize: 9 },
      body: [
        [
          {
            content: `Note: ${String(sources.other_sources_note)}`,
            styles: { cellPadding: 6, textColor: [71, 85, 105] },
          },
        ],
      ],
      margin: { left: marginX, right: marginX },
    });
    cursorY = doc.lastAutoTable.finalY;
  }
  cursorY += 10;

  /* -------- USE OF FUND -------- */
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "USE OF FUND",
          styles: {
            fillColor: [66, 103, 178],
            textColor: 255,
            fontStyle: "bold",
            cellPadding: 6,
          },
        },
      ],
    ],
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY;

  if (Array.isArray(uses) && uses.length) {
    autoTable(doc, {
      startY: cursorY,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: 20,
        fontStyle: "bold",
      },
      head: [
        [
          "DATE",
          "QTY",
          "UNIT",
          "PARTICULARS",
          "SHEET NO.",
          "AMOUNT",
          "IN-CHARGE",
        ],
      ],
      body: uses.map((r) => [
        r?.date ? fmtDate(r.date) : "—",
        num(r?.qty ?? "", 0),
        r?.unit || "—",
        r?.particulars || "—",
        r?.sheet_no || "—",
        num(r?.amount ?? "", 2),
        r?.in_charge || "—",
      ]),
      columnStyles: {
        0: { cellWidth: 82 },
        1: { cellWidth: 44, halign: "right" },
        2: { cellWidth: 56 },
        3: { cellWidth: 200 },
        4: { cellWidth: 76 },
        5: { cellWidth: 78, halign: "right" },
        6: { cellWidth: "auto" },
      },
      margin: { left: marginX, right: marginX },
      foot: [["", "", "", "", "TOTAL", num(lf.total_uses_amount, 2), ""]],
      footStyles: { fontStyle: "bold" },
    });
  } else {
    autoTable(doc, {
      startY: cursorY,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 8 },
      body: [["—"]],
      margin: { left: marginX, right: marginX },
    });
  }
  cursorY = doc.lastAutoTable.finalY + 10;

  /* -------- REMARKS -------- */
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "REMARKS",
          styles: {
            fillColor: [66, 103, 178],
            textColor: 255,
            fontStyle: "bold",
            cellPadding: 6,
          },
        },
      ],
    ],
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY;
  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 8 },
    body: [[lf.remarks && String(lf.remarks).trim() ? lf.remarks : "—"]],
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY + 10;

  /* -------- SIGNATORIES -------- */
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "SIGNATORIES",
          styles: {
            fillColor: [66, 103, 178],
            textColor: 255,
            fontStyle: "bold",
            cellPadding: 6,
          },
        },
      ],
    ],
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY;

  const filerOverride = String(lf?.file_by_user_name || "").trim();
  const preparer =
    filerOverride ||
    (lf?.filed_by
      ? `${lf.filed_by.first_name || ""} ${lf.filed_by.last_name || ""}`.trim()
      : "");
  const approver = lf?.approver
    ? `${lf.approver.first_name || ""} ${lf.approver.last_name || ""}`.trim()
    : "";

  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 10 },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: 20,
      fontStyle: "bold",
    },
    head: [["PREPARED BY:", "APPROVED BY:"]],
    body: [[preparer || " ", approver || " "]],
    columnStyles: {
      0: { cellWidth: (pageW - marginX * 2) / 2 },
      1: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        data.cell.styles.halign = "center";
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.cellPadding = {
          top: 16,
          right: 10,
          bottom: 18,
          left: 10,
        };
      }
    },
    margin: { left: marginX, right: marginX },
  });

  /* -------- Footer -------- */
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Generated on ${dayjs().format("YYYY-MM-DD HH:mm")} • ${
      window.location.origin
    }`,
    marginX,
    footerY
  );

  return doc;
}

export async function printLiquidationFormPdf(lf) {
  const doc = await buildLiquidationFormPdfDoc(lf);
  doc.save(`${lf.reference_code || "Liquidation_Fund"}.pdf`);
}

export { buildLiquidationFormPdfDoc };
