import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Normalize a string for jsPDF (Latin-1 / Helvetica font).
 * Replaces Unicode characters outside Latin-1 with ASCII equivalents
 * so they render correctly without embedding a custom font.
 */
function pdfSafe(value) {
  return String(value ?? '')
    .replace(/ /g, ' ')   // NARROW NO-BREAK SPACE (fr-FR thousands sep) → space
    .replace(/ /g, ' ')   // NO-BREAK SPACE → space
    .replace(/–/g, '-')   // en dash → hyphen
    .replace(/—/g, '-')   // em dash → hyphen
    .replace(/’/g, "'")   // RIGHT SINGLE QUOTATION MARK → apostrophe
    .replace(/“/g, '"')   // LEFT DOUBLE QUOTATION MARK
    .replace(/”/g, '"');  // RIGHT DOUBLE QUOTATION MARK
}

/**
 * Format a number for PDF: avoids locale Unicode spaces, uses ASCII space as thousands sep.
 */
export function fmtPDF(n) {
  const num = parseFloat(n) || 0;
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Export data to an Excel (.xlsx) file.
 * @param {Object[]} rows   - Array of flat objects (one row per item)
 * @param {string[]} headers - Column headers (must match object keys)
 * @param {string}   filename - Filename without extension
 * @param {string}   sheetName
 */
export function exportToExcel(rows, headers, filename = 'export', sheetName = 'Données') {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Auto-size columns
  const colWidths = headers.map(h => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[h] ?? '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export data to a PDF file with a styled table.
 * @param {string}     title    - Document title shown at top
 * @param {string[]}   columns  - Column header labels
 * @param {string[][]} rows     - Array of row arrays (values in same order as columns)
 * @param {string}     filename - Filename without extension
 * @param {Object}     meta     - Optional key/value pairs shown below title (e.g. {Site, Période})
 */
export function exportToPDF(title, columns, rows, filename = 'export', meta = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Header bar
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 0, pageW, 18, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfSafe(title), 14, 12);

  // Date right-aligned
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(pdfSafe(`Exporte le ${today}`), pageW - 14, 12, { align: 'right' });

  // Meta info
  let y = 24;
  const metaEntries = Object.entries(meta);
  if (metaEntries.length) {
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    metaEntries.forEach(([k, v]) => {
      doc.setFont('helvetica', 'bold');
      const keyStr = pdfSafe(`${k} :`);
      doc.text(keyStr, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(pdfSafe(String(v)), 14 + doc.getTextWidth(`${k} : `), y);
      y += 5;
    });
    y += 2;
  }

  // Normalize all cell values to PDF-safe strings
  const safeColumns = columns.map(pdfSafe);
  const safeRows = rows.map(row => row.map(pdfSafe));

  // Table
  autoTable(doc, {
    startY: y,
    head: [safeColumns],
    body: safeRows,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2,
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} / ${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
    doc.text('Campus LMS', 14, doc.internal.pageSize.getHeight() - 6);
  }

  doc.save(`${filename}.pdf`);
}
