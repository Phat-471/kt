import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NormalizedTransaction, ReconciliationPair, Client } from '../types/accounting';

// Hỗ trợ xuất PDF Tiếng Việt chuẩn hoá (bằng cách loại bỏ dấu tiếng Việt hoặc dùng font cơ bản an toàn nếu không nhúng font ttf custom)
function removeVietnameseTones(str: string): string {
  if (!str) return '';
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  return str;
}

export function exportReconciliationPDF(
  client: Client | null,
  vouchers: NormalizedTransaction[],
  statements: NormalizedTransaction[],
  reconciliations: ReconciliationPair[]
) {
  const doc = new jsPDF();
  const companyName = removeVietnameseTones(client?.name || 'CONG TY');
  const taxCode = client?.taxCode || '---';

  // Title
  doc.setFontSize(16);
  doc.text('BAO CAO DOI CHIEU SO SACH VA SAO KE NGAN HANG', 14, 20);
  doc.setFontSize(10);
  doc.text(`Cong ty: ${companyName} - MST: ${taxCode}`, 14, 28);
  doc.text(`Ngay xuat bao cao: ${new Date().toLocaleDateString('vi-VN')}`, 14, 34);

  // Table 1: Matched Pairs
  doc.setFontSize(12);
  doc.text('1. Danh sach cac cap da doi chieu trung khop', 14, 44);

  const matchedData = reconciliations.map((rec, idx) => {
    const v = vouchers.find(x => x.id === rec.voucherId);
    const s = statements.find(x => x.id === rec.statementId);
    return [
      idx + 1,
      v?.voucherNo || '',
      v?.date || '',
      (v?.amount || 0).toLocaleString('vi-VN'),
      removeVietnameseTones(s?.description || ''),
      `${rec.matchScore}%`,
    ];
  });

  autoTable(doc, {
    startY: 48,
    head: [['STT', 'So CT', 'Ngay CT', 'So tien (VND)', 'Noi dung Sao ke', 'Diem khop']],
    body: matchedData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  // Table 2: Unmatched Vouchers
  const matchedVoucherIds = new Set(reconciliations.map(r => r.voucherId));
  const unmatchedVouchers = vouchers.filter(v => !matchedVoucherIds.has(v.id));

  let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 100;
  doc.setFontSize(12);
  doc.text('2. Danh sach Phieu Thu/Chi chua doi chieu', 14, finalY);

  const unmatchedVoucherData = unmatchedVouchers.map((v, idx) => [
    idx + 1,
    v.voucherNo || '',
    v.date || '',
    removeVietnameseTones(v.description || ''),
    v.amount.toLocaleString('vi-VN'),
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: [['STT', 'So CT', 'Ngay CT', 'Dien giai', 'So tien (VND)']],
    body: unmatchedVoucherData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [185, 28, 28] },
  });

  doc.save(`Bao_Cao_Doi_Chieu_${taxCode}.pdf`);
}

export function exportValidationDiagnosticsPDF(
  client: Client | null,
  transactions: NormalizedTransaction[]
) {
  const doc = new jsPDF();
  const companyName = removeVietnameseTones(client?.name || 'CONG TY');

  doc.setFontSize(16);
  doc.text('BAO CAO KIEM LOI CHUNG TU KE TOAN', 14, 20);
  doc.setFontSize(10);
  doc.text(`Don vi: ${companyName} | Ngay xuat: ${new Date().toLocaleDateString('vi-VN')}`, 14, 28);

  const errorTxs = transactions.filter(t => t.validationStatus === 'ERROR' || t.validationStatus === 'WARNING');

  const rows = errorTxs.map((t, idx) => [
    idx + 1,
    t.voucherNo || 'N/A',
    t.date,
    t.validationStatus === 'ERROR' ? 'LOI' : 'CANH BAO',
    removeVietnameseTones(t.errors.map(e => e.message).join('; ')),
    t.amount.toLocaleString('vi-VN'),
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['STT', 'So CT', 'Ngay', 'Muc do', 'Noi dung canh bao / loi', 'So tien (VND)']],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [217, 119, 6] },
  });

  doc.save(`Bao_Cao_Kiem_Loi_${client?.taxCode || 'AccoDesk'}.pdf`);
}
