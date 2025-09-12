// src/utils/printActivityDesign.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";
import QRCode from "qrcode"; // 👍 add this

const ORG_TITLE = "KOLEHIYO NG PANTUKAN";
const ORG_SUBTITLE = "Juan A. Sarenas Campus, Kingking, Pantukan, Davao de Oro";
const VERIFY_BASE = "https://osas.knp.edu.ph/#/verify-actdesign?id=";

const fmt = (d) => (d ? dayjs(d).format("MMMM DD, YYYY") : "—");
const money = (v) =>
  v == null || v === ""
    ? "—"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const baseUrl = import.meta?.env?.BASE_URL || "/";
const LOGO_URL = `${baseUrl}images/logo.png`;
const BANNER_URL = `${baseUrl}images/bg.jpg`;

async function toDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
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
    default:
      return [90, 90, 90];
  }
}

/* ---------------- Header (banner only) ---------------- */
async function drawHeader(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const headerH = 110;
  const marginX = 36;

  try {
    const banner = await toDataUrl(BANNER_URL);
    doc.addImage(banner, "JPEG", 0, 0, pageW, headerH, undefined, "FAST");
  } catch {
    doc.setFillColor(21, 62, 121);
    doc.rect(0, 0, pageW, headerH, "F");
  }
  doc.setGState(new doc.GState({ opacity: 0.18 }));
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, headerH, "F");
  doc.setGState(new doc.GState({ opacity: 1 }));

  try {
    const logo = await toDataUrl(LOGO_URL);
    doc.addImage(logo, "PNG", marginX, 20, 70, 70, undefined, "FAST");
  } catch {}

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
  doc.text("ACTIVITY DESIGN", pageW / 2, headerH + 24, { align: "center" });

  return headerH + 34;
}

// NEW: one-row, two-column block for STATUS + VERIFY (QR)
async function drawStatusAndVerifyRow(doc, a, startY) {
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 15;

  const idOrRef = a?.id ?? a?.reference_code ?? "";
  const verifyUrl = `${VERIFY_BASE}${encodeURIComponent(String(idOrRef))}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 0,
    width: 75,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const statusUpper = String(a.status || "").toUpperCase();
  const [r, g, b] = statusColors(statusUpper);
  const issued = a.approved_at
    ? fmt(a.approved_at)
    : a.date_filed
    ? fmt(a.date_filed)
    : "—";
  const displayUrl = `osas.knp.edu.ph/#/verify-actdesign?id=${String(idOrRef)}`;

  // Use a plain 1-row table; we will draw custom content inside each cell
  autoTable(doc, {
    startY,
    theme: "plain",
    styles: { cellPadding: 0, fontSize: 9 },
    bodyStyles: { minCellHeight: 110 },
    margin: { left: marginX, right: marginX },
    tableWidth: pageW - marginX * 2,
    body: [[{ content: "" }, { content: "" }]],
    columnStyles: {
      0: { cellWidth: pageW - marginX * 2 - 280 }, // status/meta column
      1: { cellWidth: 280 }, // verify (QR) column
    },
    didDrawCell: (data) => {
      if (data.section !== "body") return;
      const { x, y, width, height } = data.cell;
      const pad = 10;

      if (data.column.index === 0) {
        // LEFT: Status pill + texts
        // Card
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, width - 1, height, 6, 6, "F");

        // Pill
        const pillH = 24;
        const pillW = Math.min(140, width - 22);
        doc.setFillColor(r, g, b);
        doc.roundedRect(x + pad, y + pad, pillW, pillH, 12, 12, "F");

        // Pill text
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(statusUpper || "STATUS", x + pad + 10, y + pad + 16);

        // Meta
        doc.setTextColor(20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const metaY = y + pad + pillH + 14;
        doc.text(`Ref No.: ${a.reference_code || "—"}`, x + pad, metaY);
        doc.text(`Date Issued: ${issued}`, x + pad, metaY + 16);

        // Border
        doc.setDrawColor(230);
        doc.roundedRect(x, y, width - 1, height, 6, 6, "S");
      }

      if (data.column.index === 1) {
        // RIGHT: VERIFY header + QR + copy
        // Card
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

        // Border
        doc.setDrawColor(230);
        doc.roundedRect(x, y, width - 1, height, 6, 6, "S");
      }
    },
  });

  return doc.lastAutoTable.finalY;
}

async function buildActivityDesignPdfDoc(a) {
  const doc = new jsPDF({
    unit: "pt",
    format: [612, 936],
    orientation: "portrait",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 15;

  // Header & right-hand cards (status + verify)
  let cursorY = await drawHeader(doc);
  cursorY = (await drawStatusAndVerifyRow(doc, a, cursorY)) + 10;

  // Meta table
  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: {
      fillColor: [222, 235, 247],
      textColor: 20,
      fontStyle: "bold",
    },
    head: [["SEMESTER", "DATE FILED", "SCHOOL YEAR", "OFFICE/DEPARTMENT"]],
    body: [
      [
        a.semester || "—",
        fmt(a.date_filed),
        a.school_year || "—",
        a.office_department || a?.club?.name || "—",
      ],
    ],
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 120 },
      2: { cellWidth: 120 },
      3: { cellWidth: "auto" },
    },
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY + 10;

  // ACTIVITY INFORMATION
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "ACTIVITY INFORMATION",
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
        a.name_of_activity || "—",
      ],
      [
        {
          content: "VENUE",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        a.venue || "—",
      ],
      [
        {
          content: "DATE OF IMPLEMENTATION",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        fmt(a.date_of_implementation),
      ],
      [
        {
          content: "PROPOSED BUDGET",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        `${money(a.proposed_budget)}   (Source: Department Fund)`,
      ],
      [
        {
          content: "PARTICIPANTS",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        a.participants || "—",
      ],
      [
        {
          content: "NATURE OF ACTIVITY",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        a.nature_of_activity || "—",
      ], // 👈 string only
    ],
    columnStyles: {
      0: { cellWidth: 180, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY + 10;

  // Long sections
  const longSections = [
    ["RATIONALE", a.rationale],
    ["OBJECTIVES", a.objectives],
    ["DETAILS OF THE ACTIVITY", a.details_of_activity],
    ["BUDGETARY REQUIREMENTS", a.budgetary_requirements],
  ];

  longSections.forEach(([title, content]) => {
    autoTable(doc, {
      startY: cursorY,
      theme: "plain",
      styles: { fontSize: 10 },
      body: [
        [
          {
            content: title,
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
      body: [[content && String(content).trim() ? content : "—"]],
      margin: { left: marginX, right: marginX },
    });
    cursorY = doc.lastAutoTable.finalY + 10;
  });

  // Approval (names only, centered)
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "APPROVAL",
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

  const filerOverride = String(a?.file_by_user_name || "").trim();
  const preparer =
    filerOverride ||
    (a?.filed_by
      ? `${a.filed_by.first_name || ""} ${a.filed_by.last_name || ""}`.trim()
      : "");
  const noted = String(a?.noted_by || "").trim();
  const approver = a?.approver
    ? `${a.approver.first_name || ""} ${a.approver.last_name || ""}`.trim()
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
    head: [["PREPARED BY:", "NOTED BY:", "RECOMMENDING APPROVAL:"]],
    body: [
      [preparer || " ", noted || " ", approver || " "],
      [
        {
          content: "APPROVED BY:\n\n\nDR. MARY ANN R. ARAULA",
          colSpan: 3,
          styles: {
            halign: "center",
            fontStyle: "bold",
            cellPadding: { top: 4, right: 10, bottom: 4, left: 10 },
          },
        },
      ],
    ],
    columnStyles: {
      0: { cellWidth: (pageW - marginX * 2) / 3 },
      1: { cellWidth: (pageW - marginX * 2) / 3 },
      2: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === 0) {
        data.cell.styles.halign = "center";
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.cellPadding = {
          top: 16,
          right: 10,
          bottom: 4,
          left: 10,
        };
      }
    },
    margin: { left: marginX, right: marginX },
  });

  // Footer
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

export async function printActivityDesignPdf(a) {
  const doc = await buildActivityDesignPdfDoc(a);
  doc.save(`${a.reference_code || "Activity_Design"}.pdf`);
}

export { buildActivityDesignPdfDoc };
