// src/utils/printUtilizationRequest.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";
import QRCode from "qrcode";

/* ------------ ORG + Verify ------------- */
const ORG_TITLE = "KOLEHIYO NG PANTUKAN";
const ORG_SUBTITLE = "Juan A. Sarenas Campus, Kingking, Pantukan, Davao de Oro";
const VERIFY_BASE = "https://osas.knp.edu.ph/#/verify-utilization?id=";

/* ------------ Helpers ------------- */
const fmtDate = (d) => (d ? dayjs(d).format("MMMM DD, YYYY") : "—");
const fmtDateTime = (d) => (d ? dayjs(d).format("MMM DD, YYYY, h:mm A") : "—");
const fmtTime = (t) => (t ? dayjs(`2000-01-01T${t}:00`).format("h:mm A") : "—");
const num = (v, d = 0) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });

const safeParse = (v, fallback) => {
  if (Array.isArray(v)) return v;
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
    case "COMPLETED":
      return [37, 99, 235];
    default:
      return [90, 90, 90];
  }
}
function availabilityColors(av) {
  switch (String(av || "").toUpperCase()) {
    case "AVAILABLE":
      return [16, 185, 129];
    case "RESERVED":
      return [99, 102, 241];
    case "CONFLICT":
      return [239, 68, 68];
    case "MAINTENANCE":
      return [245, 158, 11];
    case "PENDING-CHECK":
      return [245, 158, 11];
    default:
      return [107, 114, 128];
  }
}

/* ---------------- Header (banner) ---------------- */
async function drawHeader(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const headerH = 110;
  const marginX = 15;

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
  doc.text("UTILIZATION REQUEST", pageW / 2, headerH + 24, { align: "center" });

  return headerH + 34;
}

/* ----- Status & Verify row (Status + Availability + QR) ----- */
async function drawStatusAndVerifyRow(doc, u, startY) {
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 15;

  const idOrRef = u?.id ?? u?.reference_code ?? "";
  const verifyUrl = `${VERIFY_BASE}${encodeURIComponent(String(idOrRef))}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 0,
    width: 75,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const statusUpper = String(u.status || "").toUpperCase();
  const [sr, sg, sb] = statusColors(statusUpper);
  const availUpper = String(u.availability_status || "").toUpperCase();
  const [ar, ag, ab] = availabilityColors(availUpper);

  const issued = u.approved_at
    ? fmtDate(u.approved_at)
    : u.date_filed
    ? fmtDate(u.date_filed)
    : "—";
  const displayUrl = `osas.knp.edu.ph/#/verify-utilization?id=${String(
    idOrRef
  )}`;

  autoTable(doc, {
    startY,
    theme: "plain",
    styles: { cellPadding: 0, fontSize: 9 },
    bodyStyles: { minCellHeight: 120 },
    margin: { left: marginX, right: marginX },
    tableWidth: pageW - marginX * 2,
    body: [[{ content: "" }, { content: "" }]],
    columnStyles: {
      0: { cellWidth: pageW - marginX * 2 - 280 }, // left
      1: { cellWidth: 280 }, // right
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
        const pillW = Math.min(160, width - 22);
        doc.setFillColor(sr, sg, sb);
        doc.roundedRect(x + pad, y + pad, pillW, pillH, 12, 12, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(statusUpper || "STATUS", x + pad + 10, y + pad + 16);

        // Availability pill (under)
        const pill2Y = y + pad + pillH + 10;
        const pill2W = Math.min(160, width - 22);
        doc.setFillColor(ar, ag, ab);
        doc.roundedRect(x + pad, pill2Y, pill2W, pillH, 12, 12, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(availUpper || "AVAILABILITY", x + pad + 10, pill2Y + 16);

        // Meta lines
        doc.setTextColor(20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        let metaY = pill2Y + pillH + 12;
        doc.text(`Ref No.: ${u.reference_code || "—"}`, x + pad, metaY);
        metaY += 16;
        doc.text(`Date Issued: ${issued}`, x + pad, metaY);

        // Border
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

        // Border
        doc.setDrawColor(230);
        doc.roundedRect(x, y, width - 1, height, 6, 6, "S");
      }
    },
  });

  return doc.lastAutoTable.finalY;
}

/* --------------- Main Export --------------- */
async function buildUtilizationRequestPdfDoc(u) {
  const doc = new jsPDF({
    unit: "pt",
    format: [612, 936],
    orientation: "portrait",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 36;

  // Normalize JSON-ish fields
  const facilities = safeParse(u.facilities, []);
  const equipment = safeParse(u.equipment_items, []);

  // Header + Status/Verify row
  let cursorY = await drawHeader(doc);
  cursorY = (await drawStatusAndVerifyRow(doc, u, cursorY)) + 10;

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

  const ad = u.activity_design || {};
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

  /* -------- SCHEDULE -------- */
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "SCHEDULE",
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

  const startAt =
    u.start_at ||
    (u.start_date && u.start_time
      ? `${u.start_date}T${u.start_time}:00`
      : null);
  const endAt =
    u.end_at ||
    (u.end_date && u.end_time ? `${u.end_date}T${u.end_time}:00` : null);

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
          content: "START",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        fmtDateTime(startAt),
      ],
      [
        {
          content: "END",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        fmtDateTime(endAt),
      ],
      [
        {
          content: "DURATION (mins)",
          styles: { fillColor: [243, 248, 255], fontStyle: "bold" },
        },
        num(u.duration_minutes),
      ],
    ],
    columnStyles: {
      0: { cellWidth: 200, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY + 10;

  /* -------- FACILITIES -------- */
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "FACILITIES",
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

  const facilitiesText =
    Array.isArray(facilities) && facilities.length
      ? "• " + facilities.join("\n• ")
      : "—";

  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 8 },
    body: [[facilitiesText]],
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY + 10;

  /* -------- EQUIPMENT / MATERIALS -------- */
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "EQUIPMENT / MATERIALS",
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

  if (Array.isArray(equipment) && equipment.length) {
    autoTable(doc, {
      startY: cursorY,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: 20,
        fontStyle: "bold",
      },
      head: [["ITEM", "QTY", "UNIT"]],
      body: equipment.map((x) => [x?.name || "—", num(x?.qty), x?.unit || "—"]),
      columnStyles: {
        0: { cellWidth: 300 },
        1: { cellWidth: 70 },
        2: { cellWidth: "auto" },
      },
      margin: { left: marginX, right: marginX },
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

  /* -------- DETAILS -------- */
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      [
        {
          content: "UTILIZATION DETAILS",
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
      [
        u.utilization_details && String(u.utilization_details).trim()
          ? u.utilization_details
          : "—",
      ],
    ],
    margin: { left: marginX, right: marginX },
  });
  cursorY = doc.lastAutoTable.finalY + 10;

  /* -------- APPROVAL -------- */
  // If not enough space, move the entire approval block to next page
  {
    const pageH = doc.internal.pageSize.getHeight();
    const bottomMargin = 30;
    const needed = 180; // heading + signatures grid (approx)
    if (cursorY + needed > pageH - bottomMargin) {
      doc.addPage();
      cursorY = 36;
    }
  }
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

  const filerOverride = String(u?.file_by_user_name || "").trim();
  const preparer =
    filerOverride ||
    (u?.filed_by
      ? `${u.filed_by.first_name || ""} ${u.filed_by.last_name || ""}`.trim()
      : "");
  const noted = String(u?.noted_by || "").trim();
  const approver = u?.approver
    ? `${u.approver.first_name || ""} ${u.approver.last_name || ""}`.trim()
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
    showHead: "firstPage",
    rowPageBreak: "avoid",
    head: [["PREPARED BY:", "NOTED BY:", "RECOMMENDING APPROVAL:"]],
    body: [
      [preparer || " ", noted || " ", approver || " "],
      [
        {
          content:
            "APPROVED BY:\n\n\nDR. MARY ANN R. ARAULA\nActing College President",
          colSpan: 3,
          styles: {
            halign: "center",
            fontStyle: "bold",
            cellPadding: { top: 14, right: 10, bottom: 16, left: 10 },
          },
        },
      ],
    ],
    columnStyles: {
      0: { cellWidth: (pageW - marginX * 2) / 2 },
      1: { cellWidth: "auto" },
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

export async function printUtilizationRequestPdf(u) {
  const doc = await buildUtilizationRequestPdfDoc(u);
  doc.save(`${u.reference_code || "Utilization_Request"}.pdf`);
}

export { buildUtilizationRequestPdfDoc };
