import { NormalizedTransaction } from '../types/accounting';

export interface NonDeductibleExpenseItem {
  id: string;
  date: string;
  voucherNo: string;
  partnerName: string;
  description: string;
  amount: number;
  reasonCode: 'NO_INVOICE_GE_5M' | 'CASH_GE_20M' | 'ADMIN_FINE' | 'EXCESSIVE_COST';
  reasonText: string;
  citTaxLossRisk: number; // Tiền thuế TNDN nguy cơ bị truy thu thêm (20%)
}

export interface CitTaxAuditResult {
  totalNonDeductibleAmount: number; // Chỉ tiêu B4 Tờ khai Quyết Toán Thuế TNDN 03/TNDN
  totalCitTaxRisk: number;          // Tiền thuế TNDN có nguy cơ bị truy thu (20%)
  noInvoiceCount: number;
  noInvoiceAmount: number;
  cashOver20mCount: number;
  cashOver20mAmount: number;
  adminFineCount: number;
  adminFineAmount: number;
  items: NonDeductibleExpenseItem[];
}

export const auditNonDeductibleExpenses = (transactions: NormalizedTransaction[]): CitTaxAuditResult => {
  const items: NonDeductibleExpenseItem[] = [];

  let noInvoiceCount = 0;
  let noInvoiceAmount = 0;
  let cashOver20mCount = 0;
  let cashOver20mAmount = 0;
  let adminFineCount = 0;
  let adminFineAmount = 0;

  transactions.forEach((t) => {
    const isExpense = t.type === 'EXPENSE' || t.creditAcc.startsWith('111') || t.creditAcc.startsWith('112');
    if (!isExpense) return;

    let isNonDeductible = false;
    let reasonCode: NonDeductibleExpenseItem['reasonCode'] = 'NO_INVOICE_GE_5M';
    let reasonText = '';

    // 1. Khoản chi >= 5M thiếu chứng từ/số HĐ
    if (t.amount >= 5000000 && (!t.voucherNo || t.voucherNo.trim() === '')) {
      isNonDeductible = true;
      reasonCode = 'NO_INVOICE_GE_5M';
      reasonText = 'Khoản chi ≥ 5.000.000 VNĐ thiếu số chứng từ/hóa đơn điện tử hợp lệ';
      noInvoiceCount++;
      noInvoiceAmount += t.amount;
    }
    // 2. Khoản chi tiền mặt >= 20M
    else if (t.amount >= 20000000 && t.creditAcc.startsWith('111')) {
      isNonDeductible = true;
      reasonCode = 'CASH_GE_20M';
      reasonText = 'Khoản chi ≥ 20.000.000 VNĐ thanh toán tiền mặt (vi phạm quy định thanh toán không dùng tiền mặt)';
      cashOver20mCount++;
      cashOver20mAmount += t.amount;
    }
    // 3. Chi phí phạt vi phạm hành chính (TK 811)
    else if (t.debitAcc.startsWith('811') && (t.description.toLowerCase().includes('phạt') || t.description.toLowerCase().includes('vi phạm'))) {
      isNonDeductible = true;
      reasonCode = 'ADMIN_FINE';
      reasonText = 'Chi phí phạt vi phạm hành chính, phạt vi phạm giao thông (không được trừ khi tính thuế TNDN)';
      adminFineCount++;
      adminFineAmount += t.amount;
    }

    if (isNonDeductible) {
      items.push({
        id: t.id,
        date: t.date,
        voucherNo: t.voucherNo || 'THIẾU CT',
        partnerName: t.partnerName || 'Chưa rõ đối tác',
        description: t.description,
        amount: t.amount,
        reasonCode,
        reasonText,
        citTaxLossRisk: t.amount * 0.20, // Nâng 20% Thuế TNDN bị truy thu
      });
    }
  });

  const totalNonDeductibleAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return {
    totalNonDeductibleAmount,
    totalCitTaxRisk: totalNonDeductibleAmount * 0.20,
    noInvoiceCount,
    noInvoiceAmount,
    cashOver20mCount,
    cashOver20mAmount,
    adminFineCount,
    adminFineAmount,
    items,
  };
};
