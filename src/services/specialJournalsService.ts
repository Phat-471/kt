/**
 * Special Journals Service — Sổ Nhật Ký Đặc Biệt Chuẩn Thông Tư 200/2014/TT-BTC
 * Bao gồm:
 *  1. Sổ Nhật ký Mua hàng (đối chiếu Nợ 152/156/627/642/242, Có 331/111/112)
 *  2. Sổ Nhật ký Bán hàng (đối chiếu Nợ 131/111/112, Có 511/515/711/3331)
 *  3. Sổ Nhật ký Thu tiền (đối chiếu Nợ 1111/1121)
 *  4. Sổ Nhật ký Chi tiền (đối chiếu Có 1111/1121)
 */

import { NormalizedTransaction } from '../types/accounting';

export type SpecialJournalType = 'PURCHASE' | 'SALES' | 'CASH_RECEIPT' | 'CASH_DISBURSEMENT';

export interface SpecialJournalRow {
  stt: number;
  date: string;
  voucherNo: string;
  description: string;
  debitAcc: string;
  creditAcc: string;
  partnerName: string;
  partnerTaxCode: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface SpecialJournalSummary {
  type: SpecialJournalType;
  title: string;
  rows: SpecialJournalRow[];
  totalAmount: number;
  totalVAT: number;
  grandTotal: number;
}

export function generateSpecialJournal(
  transactions: NormalizedTransaction[],
  type: SpecialJournalType,
  period?: { from: string; to: string }
): SpecialJournalSummary {
  let filtered = period 
    ? transactions.filter(t => t.date >= period.from && t.date <= period.to)
    : transactions;

  let title = '';
  let rows: SpecialJournalRow[] = [];

  if (type === 'PURCHASE') {
    title = 'SỔ NHẬT KÝ MUA HÀNG (Mẫu S03a-DN)';
    filtered = filtered.filter(t => 
      t.creditAcc?.startsWith('331') || 
      t.debitAcc?.startsWith('152') || 
      t.debitAcc?.startsWith('153') || 
      t.debitAcc?.startsWith('156') || 
      t.debitAcc?.startsWith('211')
    );
  } else if (type === 'SALES') {
    title = 'SỔ NHẬT KÝ BÁN HÀNG (Mẫu S03b-DN)';
    filtered = filtered.filter(t => 
      t.debitAcc?.startsWith('131') || 
      t.creditAcc?.startsWith('511') || 
      t.creditAcc?.startsWith('515') || 
      t.creditAcc?.startsWith('711')
    );
  } else if (type === 'CASH_RECEIPT') {
    title = 'SỔ NHẬT KÝ THU TIỀN (Mẫu S03c-DN)';
    filtered = filtered.filter(t => 
      t.debitAcc?.startsWith('111') || 
      t.debitAcc?.startsWith('112')
    );
  } else if (type === 'CASH_DISBURSEMENT') {
    title = 'SỔ NHẬT KÝ CHI TIỀN (Mẫu S03d-DN)';
    filtered = filtered.filter(t => 
      t.creditAcc?.startsWith('111') || 
      t.creditAcc?.startsWith('112')
    );
  }

  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

  rows = sorted.map((t, idx) => {
    const vat = t.creditAcc?.startsWith('3331') || t.debitAcc?.startsWith('133') ? t.amount * 0.1 : 0;
    return {
      stt: idx + 1,
      date: t.date,
      voucherNo: t.voucherNo,
      description: t.description || '',
      debitAcc: t.debitAcc || '',
      creditAcc: t.creditAcc || '',
      partnerName: t.partnerName || '',
      partnerTaxCode: t.partnerTaxCode || '',
      amount: t.amount,
      vatAmount: vat,
      totalAmount: t.amount + vat,
    };
  });

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const totalVAT = rows.reduce((s, r) => s + r.vatAmount, 0);
  const grandTotal = totalAmount + totalVAT;

  return {
    type,
    title,
    rows,
    totalAmount,
    totalVAT,
    grandTotal,
  };
}

/**
 * Xuất Sổ Nhật Ký Đặc Biệt ra file Excel định dạng chuẩn
 */
export function exportSpecialJournalToExcel(
  summary: SpecialJournalSummary,
  companyName: string = 'Doanh nghiệp'
): void {
  // Dynamic import or standard XLSX
  import('xlsx').then(XLSX => {
    const data = summary.rows.map(r => ({
      'STT': r.stt,
      'Ngày chứng từ': r.date,
      'Số chứng từ': r.voucherNo,
      'Diễn giải / Nội dung': r.description,
      'TK Nợ': r.debitAcc,
      'TK Có': r.creditAcc,
      'Đối tác': r.partnerName,
      'Mã số thuế': r.partnerTaxCode,
      'Số tiền chưa thuế (VND)': r.amount,
      'Tiền thuế GTGT (VND)': r.vatAmount,
      'Tổng cộng (VND)': r.totalAmount,
    }));

    // Thêm dòng tổng cộng
    data.push({
      'STT': 0 as any,
      'Ngày chứng từ': '',
      'Số chứng từ': '',
      'Diễn giải / Nội dung': 'TỔNG CỘNG',
      'TK Nợ': '',
      'TK Có': '',
      'Đối tác': '',
      'Mã số thuế': '',
      'Số tiền chưa thuế (VND)': summary.totalAmount,
      'Tiền thuế GTGT (VND)': summary.totalVAT,
      'Tổng cộng (VND)': summary.grandTotal,
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    const sheetName = summary.type.slice(0, 25);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const safeName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${summary.type}_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  });
}

