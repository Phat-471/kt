import { NormalizedTransaction } from '../types/accounting';

// --- 1. KẾ TOÁN KHO & THẺ KHO ---
export interface InventoryCardItem {
  itemName: string;
  unit?: string;
  openingQty: number;
  importedQty: number;
  exportedQty: number;
  closingQty: number;
  totalImportAmount: number;
  totalExportAmount: number;
  avgPrice: number;
  isNegativeStock: boolean;
  history: Array<{
    id: string;
    date: string;
    refNo: string;
    type: 'IMPORT' | 'EXPORT';
    qty: number;
    amount: number;
    description: string;
  }>;
}

export const calculateInventoryCardReport = (transactions: NormalizedTransaction[]): InventoryCardItem[] => {
  const map: Record<string, InventoryCardItem> = {};

  transactions.forEach((t) => {
    const itemName = t.description ? t.description.trim() : 'Vật tư / Hàng hóa chung';
    if (!map[itemName]) {
      map[itemName] = {
        itemName,
        openingQty: 0,
        importedQty: 0,
        exportedQty: 0,
        closingQty: 0,
        totalImportAmount: 0,
        totalExportAmount: 0,
        avgPrice: 0,
        isNegativeStock: false,
        history: [],
      };
    }

    const item = map[itemName];
    const isImport = t.type === 'INCOME' || t.debitAcc.startsWith('156') || t.debitAcc.startsWith('152') || t.creditAcc.startsWith('331');
    const qty = 1; // Mặc định 1 lượt/đơn vị chứng từ

    if (isImport) {
      item.importedQty += qty;
      item.totalImportAmount += t.amount;
      item.history.push({
        id: t.id,
        date: t.date,
        refNo: t.voucherNo || t.id.slice(0, 6),
        type: 'IMPORT',
        qty,
        amount: t.amount,
        description: t.description,
      });
    } else {
      item.exportedQty += qty;
      item.totalExportAmount += t.amount;
      item.history.push({
        id: t.id,
        date: t.date,
        refNo: t.voucherNo || t.id.slice(0, 6),
        type: 'EXPORT',
        qty,
        amount: t.amount,
        description: t.description,
      });
    }

    item.closingQty = item.openingQty + item.importedQty - item.exportedQty;
    item.isNegativeStock = item.closingQty < 0;
    const totalQty = item.importedQty || 1;
    item.avgPrice = item.totalImportAmount / totalQty;
  });

  return Object.values(map);
};

// --- 2. KẾ TOÁN THU CHI QUỸ (111) & NGÂN HÀNG (112) ---
export interface CashAndBankLedger {
  cashIn: number;
  cashOut: number;
  cashBalance: number;
  bankIn: number;
  bankOut: number;
  bankBalance: number;
  cashTxList: NormalizedTransaction[];
  bankTxList: NormalizedTransaction[];
}

export const calculateCashAndBankLedger = (transactions: NormalizedTransaction[]): CashAndBankLedger => {
  let cashIn = 0;
  let cashOut = 0;
  let bankIn = 0;
  let bankOut = 0;

  const cashTxList: NormalizedTransaction[] = [];
  const bankTxList: NormalizedTransaction[] = [];

  transactions.forEach((t) => {
    // TK 111 - Tiền mặt
    if (t.debitAcc.startsWith('111')) {
      cashIn += t.amount;
      cashTxList.push(t);
    } else if (t.creditAcc.startsWith('111')) {
      cashOut += t.amount;
      cashTxList.push(t);
    }

    // TK 112 - Tiền gửi Ngân hàng
    if (t.debitAcc.startsWith('112')) {
      bankIn += t.amount;
      bankTxList.push(t);
    } else if (t.creditAcc.startsWith('112')) {
      bankOut += t.amount;
      bankTxList.push(t);
    }
  });

  return {
    cashIn,
    cashOut,
    cashBalance: cashIn - cashOut,
    bankIn,
    bankOut,
    bankBalance: bankIn - bankOut,
    cashTxList,
    bankTxList,
  };
};

// --- 3. QUẢN LÝ CÔNG NỢ PHẢI THU (131) & PHẢI TRẢ (331) & AGING DEBT ---
export interface PartnerDebtItem {
  partnerName: string;
  taxCode?: string;
  type: 'RECEIVABLE_131' | 'PAYABLE_331';
  openingDebt: number;
  increasedDebt: number; // Phát sinh nợ tăng
  decreasedDebt: number; // Thấu chi / Đã thanh toán
  closingDebt: number;
  // Aging Analysis
  currentDebt: number; // Trong hạn (<30 ngày)
  overdue1_30: number; // Quá hạn 1-30 ngày
  overdue31_90: number; // Quá hạn 31-90 ngày
  overdueOver90: number; // Quá hạn > 90 ngày
  transactions: NormalizedTransaction[];
}

export const calculatePartnerDebtReport = (transactions: NormalizedTransaction[]): PartnerDebtItem[] => {
  const map: Record<string, PartnerDebtItem> = {};
  const today = new Date().getTime();

  transactions.forEach((t) => {
    const partnerName = t.partnerName ? t.partnerName.trim() : 'Đối tác chưa tên';
    const is131 = t.debitAcc.startsWith('131') || t.creditAcc.startsWith('131') || t.type === 'INCOME';
    const is331 = t.debitAcc.startsWith('331') || t.creditAcc.startsWith('331') || t.type === 'EXPENSE';

    if (!is131 && !is331) return;

    const key = `${partnerName}_${is131 ? '131' : '331'}`;

    if (!map[key]) {
      map[key] = {
        partnerName,
        taxCode: t.partnerTaxCode || '',
        type: is131 ? 'RECEIVABLE_131' : 'PAYABLE_331',
        openingDebt: 0,
        increasedDebt: 0,
        decreasedDebt: 0,
        closingDebt: 0,
        currentDebt: 0,
        overdue1_30: 0,
        overdue31_90: 0,
        overdueOver90: 0,
        transactions: [],
      };
    }

    const item = map[key];
    item.transactions.push(t);

    if (is131) {
      if (t.debitAcc.startsWith('131') || t.type === 'INCOME') {
        item.increasedDebt += t.amount;
      } else {
        item.decreasedDebt += t.amount;
      }
    } else {
      if (t.creditAcc.startsWith('331') || t.type === 'EXPENSE') {
        item.increasedDebt += t.amount;
      } else {
        item.decreasedDebt += t.amount;
      }
    }

    item.closingDebt = item.openingDebt + item.increasedDebt - item.decreasedDebt;

    // Calculate Aging Debt
    const txDate = new Date(t.date).getTime();
    const daysDiff = Math.max(0, Math.floor((today - txDate) / (1000 * 60 * 60 * 24)));

    if (daysDiff <= 30) {
      item.currentDebt += t.amount;
    } else if (daysDiff <= 60) {
      item.overdue1_30 += t.amount;
    } else if (daysDiff <= 90) {
      item.overdue31_90 += t.amount;
    } else {
      item.overdueOver90 += t.amount;
    }
  });

  return Object.values(map);
};

// --- 4. KỂ TOÁN THUẾ & KIỂM SOÁT RỦI RO THUẾ ---
export interface TaxRiskSummary {
  highExpenseNoInvoiceCount: number;
  highExpenseNoInvoiceAmount: number;
  cashOver20mCount: number; // Chi tiền mặt >= 20tr
  cashOver20mAmount: number;
  outputVat: number;
  inputVat: number;
  netVatPayable: number;
}

export const calculateTaxRiskSummary = (transactions: NormalizedTransaction[]): TaxRiskSummary => {
  let highExpenseNoInvoiceCount = 0;
  let highExpenseNoInvoiceAmount = 0;
  let cashOver20mCount = 0;
  let cashOver20mAmount = 0;
  let outputVat = 0;
  let inputVat = 0;

  transactions.forEach((t) => {
    const isExpense = t.type === 'EXPENSE' || t.creditAcc.startsWith('111') || t.creditAcc.startsWith('112');
    const isCash = t.creditAcc.startsWith('111');

    // Rule 10: Chi >= 5tr thiếu số chứng từ/hóa đơn
    if (isExpense && t.amount >= 5000000 && (!t.voucherNo || t.voucherNo.trim() === '')) {
      highExpenseNoInvoiceCount += 1;
      highExpenseNoInvoiceAmount += t.amount;
    }

    // Rule 11: Chi tiền mặt >= 20tr (Rủi ro thuế GTGT TNDN)
    if (isExpense && isCash && t.amount >= 20000000) {
      cashOver20mCount += 1;
      cashOver20mAmount += t.amount;
    }

    // VAT
    if (t.type === 'INCOME') {
      outputVat += t.amount * 0.1;
    } else if (t.type === 'EXPENSE') {
      inputVat += t.amount * 0.1;
    }
  });

  return {
    highExpenseNoInvoiceCount,
    highExpenseNoInvoiceAmount,
    cashOver20mCount,
    cashOver20mAmount,
    outputVat,
    inputVat,
    netVatPayable: Math.max(0, outputVat - inputVat),
  };
};
