import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthEndClosingAuditResult } from './monthEndClosingService';
import { Client } from '../types/accounting';

export const exportMonthEndClosingPDF = (
  client: Client | null,
  auditResult: MonthEndClosingAuditResult
): void => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const clientName = client ? client.name : 'Doanh Nghiệp Kế Toán';
  const taxCode = client ? client.taxCode : '0101234567';

  // Header Company Title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(clientName.toUpperCase(), 14, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`MST: ${taxCode} | Nien do: ${client?.financialYear || 2026}`, 14, 20);

  // Main Report Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BIEN BAN KIEM TRA KHOA SO THANG', 105, 30, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ky khoa so: ${auditResult.periodMonth} | Ngay lap: ${auditResult.closingDate}`, 105, 36, { align: 'center' });

  // Summary Risk Box
  doc.setFillColor(auditResult.isReadyToClose ? 240 : 254, auditResult.isReadyToClose ? 253 : 242, auditResult.isReadyToClose ? 244 : 242);
  doc.rect(14, 42, 182, 16, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`TRANG THAI KHOA SO: ${auditResult.isReadyToClose ? 'HOAN THANH (SAN SANG KHOA SO)' : 'CHUA HOAN THANH (CAN XU LY LOI)'}`, 18, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Muc do rui ro: ${auditResult.overallRiskLevel} | Dat: ${auditResult.passedRulesCount}/${auditResult.totalRulesCount} tieu chi | Ton tai: ${auditResult.pendingIssuesCount} van de`, 18, 54);

  // Table Data of 10 Checklist Rules
  const tableData = auditResult.rules.map(r => [
    r.title,
    r.status === 'PASSED' ? 'DAT' : r.status === 'FAILED' ? 'LOI' : 'CANH BAO',
    r.riskImpact,
    r.detailsMessage,
  ]);

  autoTable(doc, {
    startY: 62,
    head: [['Tieu Chi Kiểm Tra', 'Ket Qua', 'Rui Ro', 'Chi Tiet Noi Dung Audit']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 87 },
    },
  });

  // Signature Block
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('NGUOI LAP BIEU', 35, finalY);
  doc.text('KE TOAN TRUONG', 105, finalY, { align: 'center' });
  doc.text('GIAM DOC', 170, finalY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('(Ky & ho ten)', 35, finalY + 5);
  doc.text('(Ky & ho ten)', 105, finalY + 5, { align: 'center' });
  doc.text('(Ky & dong dau)', 170, finalY + 5, { align: 'right' });

  doc.save(`Bien_Ban_Khoa_So_Thang_${auditResult.periodMonth.replace('/', '_')}.pdf`);
};
