/**
 * Ledger PDF Exporter — Xuất PDF Sổ Kế Toán Chuẩn TT200
 * Thư viện: jsPDF 4.x + jspdf-autotable 5.x
 */

import jsPDF from 'jspdf';
import autoTable, { CellDef, RowInput } from 'jspdf-autotable';
import { NormalizedTransaction, Client } from '../types/accounting';

// ============================================================
// HELPERS & CONSTANTS
// ============================================================

const fmt = (n: number) => n.toLocaleString('vi-VN');
const PAGE_MARGIN = 14;
const HEADER_COLOR: [number, number, number] = [30, 80, 60];
const LIGHT_GRAY: [number, number, number] = [245, 247, 250];
const WHITE: [number, number, number] = [255, 255, 255];

type HAlign = 'left' | 'center' | 'right';

/** Helper — tạo cell có align + tuỳ chọn textColor/fillColor */
function cell(
  content: string,
  halign: HAlign = 'left',
  opts?: { textColor?: [number,number,number]; fillColor?: [number,number,number]; fontStyle?: 'bold' | 'normal'; colSpan?: number }
): CellDef {
  return {
    content,
    colSpan: opts?.colSpan,
    styles: {
      halign,
      ...(opts?.textColor ? { textColor: opts.textColor } : {}),
      ...(opts?.fillColor ? { fillColor: opts.fillColor } : {}),
      ...(opts?.fontStyle ? { fontStyle: opts.fontStyle } : {}),
    },
  } as CellDef;
}

export interface PDFOptions {
  transactions: NormalizedTransaction[];
  client: Client | null;
  period?: { from: string; to: string };
  filterAccount?: string;
  preparedBy?: string;
}

// ============================================================
// SHARED HEADER
// ============================================================

function buildHeader(doc: jsPDF, title: string, subTitle: string, client: Client | null, period?: { from: string; to: string }): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFontSize(9); doc.setTextColor(180, 230, 200);
  doc.text('KẾ TOÁN PRO — Hệ Thống Quản Trị Offline', PAGE_MARGIN, 8);
  doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  doc.text(client?.name || 'Đơn vị: ..............................', PAGE_MARGIN, 14);
  doc.text(`MST: ${client?.taxCode || '..............'}`, pageW - PAGE_MARGIN, 14, { align: 'right' });
  doc.setFontSize(14); doc.setTextColor(30, 60, 50); doc.setFont('helvetica', 'bold');
  doc.text(title, pageW / 2, 32, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 100, 90);
  const periodText = period ? `Từ ngày ${period.from} đến ngày ${period.to}` : subTitle;
  doc.text(periodText, pageW / 2, 38, { align: 'center' });
  const now = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.setFontSize(8); doc.setTextColor(120, 130, 120);
  doc.text(`Ngày in: ${now}`, pageW - PAGE_MARGIN, 38, { align: 'right' });
  return 44;
}

// ============================================================
// SHARED FOOTER
// ============================================================

function buildFooter(doc: jsPDF, preparedBy = ''): void {
  const pages = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`Trang ${i}/${pages}`, pageW / 2, pageH - 6, { align: 'center' });
    if (i === pages) {
      const sigY = pageH - 30;
      const cols = [pageW * 0.18, pageW * 0.5, pageW * 0.82];
      ['Người Lập Biểu', 'Kế Toán Trưởng', 'Giám Đốc'].forEach((label, idx) => {
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
        doc.text(label, cols[idx], sigY, { align: 'center' });
        doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
        doc.text('(Ký, ghi rõ họ tên)', cols[idx], sigY + 4, { align: 'center' });
      });
      if (preparedBy) {
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 80, 60);
        doc.text(preparedBy, cols[0], sigY + 18, { align: 'center' });
      }
    }
  }
}

// ============================================================
// EXPORT 1: NHẬT KÝ CHUNG
// ============================================================

export function exportNhatKyChungPDF(opts: PDFOptions): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { transactions, client, period, preparedBy } = opts;
  const startY = buildHeader(doc, 'NHẬT KÝ CHUNG', 'Toàn bộ bút toán theo thứ tự thời gian', client, period);

  const txs = period ? transactions.filter(t => t.date >= period.from && t.date <= period.to) : transactions;
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  const totalAmt = sorted.reduce((s, t) => s + t.amount, 0);

  const body: RowInput[] = [
    ...sorted.map(t => [
      cell(t.date, 'center'),
      cell(t.voucherNo, 'center'),
      t.description || '',
      cell(t.debitAcc, 'center', { textColor: [180, 80, 20] }),
      cell(t.creditAcc, 'center', { textColor: [30, 80, 160] }),
      cell(fmt(t.amount), 'right'),
    ] as RowInput),
    [
      cell('CỘNG', 'right', { colSpan: 5, fontStyle: 'bold', fillColor: LIGHT_GRAY }),
      cell(fmt(totalAmt), 'right', { fontStyle: 'bold', fillColor: LIGHT_GRAY }),
    ] as RowInput,
  ];

  autoTable(doc, {
    startY, margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [[
      cell('Ngày CT', 'center'), cell('Số CT', 'center'),
      cell('Diễn Giải', 'left'), cell('TK Nợ', 'center'),
      cell('TK Có', 'center'), cell('Số Tiền (đ)', 'right'),
    ]],
    body,
    headStyles: { fillColor: HEADER_COLOR, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [249, 252, 250] },
    columnStyles: { 2: { cellWidth: 'auto' } },
  });

  buildFooter(doc, preparedBy);
  doc.save(`NhatKyChung_${Date.now()}.pdf`);
}

// ============================================================
// EXPORT 2: SỔ CÁI
// ============================================================

export function exportSoCaiPDF(opts: PDFOptions): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { transactions, client, period, preparedBy, filterAccount } = opts;
  const startY = buildHeader(doc, `SỔ CÁI TÀI KHOẢN ${filterAccount || ''}`, 'Tổng hợp phát sinh theo tài khoản', client, period);

  const txs = period ? transactions.filter(t => t.date >= period.from && t.date <= period.to) : transactions;

  // Nhóm theo TK
  const grouped: Record<string, NormalizedTransaction[]> = {};
  txs.forEach(t => {
    const accs = filterAccount
      ? [t.debitAcc, t.creditAcc].filter(a => a?.startsWith(filterAccount))
      : [t.debitAcc, t.creditAcc].filter(Boolean);
    accs.forEach(acc => { if (acc) grouped[acc] = [...(grouped[acc] || []), t]; });
  });

  let currentY = startY;
  let isFirstPage = true;

  Object.keys(grouped).sort().forEach(acc => {
    const sorted = [...grouped[acc]].sort((a, b) => a.date.localeCompare(b.date));
    const psNo = sorted.filter(t => t.debitAcc === acc).reduce((s, t) => s + t.amount, 0);
    const psCo = sorted.filter(t => t.creditAcc === acc).reduce((s, t) => s + t.amount, 0);
    const soDu = psNo - psCo;

    if (!isFirstPage) {
      doc.addPage();
      currentY = buildHeader(doc, `SỔ CÁI TÀI KHOẢN ${acc}`, '', client, period);
    }
    isFirstPage = false;

    doc.setFontSize(10); doc.setTextColor(16, 120, 90); doc.setFont('helvetica', 'bold');
    doc.text(`Tài khoản: ${acc}`, PAGE_MARGIN, currentY);
    currentY += 4;

    const body: RowInput[] = [
      ...sorted.map(t => {
        const isDebit = t.debitAcc === acc;
        return [
          cell(t.date, 'center'),
          cell(t.voucherNo, 'center'),
          t.description || '',
          cell(isDebit ? t.creditAcc : t.debitAcc, 'center'),
          cell(isDebit ? fmt(t.amount) : '', 'right', { textColor: [180, 60, 20] }),
          cell(!isDebit ? fmt(t.amount) : '', 'right', { textColor: [30, 80, 160] }),
        ] as RowInput;
      }),
      [
        cell('CỘNG PHÁT SINH', 'right', { colSpan: 4, fontStyle: 'bold', fillColor: LIGHT_GRAY }),
        cell(fmt(psNo), 'right', { fontStyle: 'bold', textColor: [180, 60, 20], fillColor: LIGHT_GRAY }),
        cell(fmt(psCo), 'right', { fontStyle: 'bold', textColor: [30, 80, 160], fillColor: LIGHT_GRAY }),
      ] as RowInput,
      [
        cell(`SỐ DƯ CUỐI KỲ (${soDu >= 0 ? 'Dư Nợ' : 'Dư Có'})`, 'right', { colSpan: 4, fontStyle: 'bold', fillColor: HEADER_COLOR, textColor: WHITE }),
        cell(soDu >= 0 ? fmt(soDu) : '', 'right', { fontStyle: 'bold', fillColor: HEADER_COLOR, textColor: WHITE }),
        cell(soDu < 0 ? fmt(Math.abs(soDu)) : '', 'right', { fontStyle: 'bold', fillColor: HEADER_COLOR, textColor: WHITE }),
      ] as RowInput,
    ];

    autoTable(doc, {
      startY: currentY, margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [[
        cell('Ngày CT', 'center'), cell('Số CT', 'center'), cell('Diễn Giải', 'left'),
        cell('TK Đối Ứng', 'center'), cell('Phát Sinh Nợ', 'right'), cell('Phát Sinh Có', 'right'),
      ]],
      body,
      headStyles: { fillColor: HEADER_COLOR, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [249, 252, 250] },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  });

  buildFooter(doc, preparedBy);
  doc.save(`SoCai_${filterAccount || 'TatCa'}_${Date.now()}.pdf`);
}

// ============================================================
// EXPORT 3: SỔ CHI TIẾT
// ============================================================

export function exportSoChiTietPDF(opts: PDFOptions): void {
  const { transactions, client, period, filterAccount = '111', preparedBy } = opts;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const startY = buildHeader(doc, `SỔ CHI TIẾT TÀI KHOẢN ${filterAccount}`, 'Số dư lũy kế từng dòng phát sinh', client, period);

  const txs = (period
    ? transactions.filter(t => t.date >= period.from && t.date <= period.to)
    : transactions
  ).filter(t => t.debitAcc?.startsWith(filterAccount) || t.creditAcc?.startsWith(filterAccount))
   .sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;

  const body: RowInput[] = txs.map(t => {
    const isDebit = t.debitAcc?.startsWith(filterAccount);
    balance = isDebit ? balance + t.amount : balance - t.amount;
    return [
      cell(t.date, 'center'),
      cell(t.voucherNo, 'center'),
      t.description || '',
      cell(isDebit ? t.creditAcc : t.debitAcc, 'center'),
      cell(isDebit ? fmt(t.amount) : '', 'right', { textColor: [180, 60, 20] }),
      cell(!isDebit ? fmt(t.amount) : '', 'right', { textColor: [30, 80, 160] }),
      cell(fmt(Math.abs(balance)), 'right', { fontStyle: 'bold', textColor: balance >= 0 ? [30, 100, 60] : [160, 30, 30] }),
    ] as RowInput;
  });

  autoTable(doc, {
    startY, margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: [[
      cell('Ngày CT', 'center'), cell('Số CT', 'center'), cell('Diễn Giải', 'left'),
      cell('TK ĐƯ', 'center'), cell('Phát Sinh Nợ', 'right'),
      cell('Phát Sinh Có', 'right'), cell('Số Dư Lũy Kế', 'right'),
    ]],
    body,
    headStyles: { fillColor: HEADER_COLOR, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [249, 252, 250] },
  });

  buildFooter(doc, preparedBy);
  doc.save(`SoChiTiet_TK${filterAccount}_${Date.now()}.pdf`);
}
