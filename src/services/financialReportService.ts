import { NormalizedTransaction } from '../types/accounting';

// --- 1. BẢNG CÂN ĐỐI PHÁT SINH TÀI KHOẢN PIVOT (TRIAL BALANCE 1XX - 9XX) ---
export interface AccountBalancePivotItem {
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  openingDebit: number;   // Dư Nợ đầu kỳ
  openingCredit: number;  // Dư Có đầu kỳ
  periodDebit: number;    // Phát sinh Nợ trong kỳ
  periodCredit: number;   // Phát sinh Có trong kỳ
  closingDebit: number;   // Dư Nợ cuối kỳ
  closingCredit: number;  // Dư Có cuối kỳ
  transactions: NormalizedTransaction[];
}

const ACCOUNT_NAME_MAP: Record<string, string> = {
  '111': 'Tiền mặt',
  '112': 'Tiền gửi Ngân hàng',
  '131': 'Phải thu của khách hàng',
  '141': 'Tạm ứng',
  '152': 'Nguyên liệu, vật liệu',
  '156': 'Hàng hóa',
  '211': 'Tài sản cố định hữu hình',
  '214': 'Hao mòn tài sản cố định',
  '242': 'Chi phí trả trước',
  '331': 'Phải trả cho người bán',
  '3331': 'Thuế GTGT phải nộp',
  '3334': 'Thuế TNDN phải nộp',
  '334': 'Phải trả người lao động',
  '411': 'Vốn đầu tư của chủ sở hữu',
  '421': 'Lợi nhuận sau thuế chưa phân phối',
  '511': 'Doanh thu bán hàng và cung cấp dịch vụ',
  '515': 'Doanh thu hoạt động tài chính',
  '632': 'Giá vốn hàng bán',
  '635': 'Chi phí tài chính',
  '641': 'Chi phí bán hàng',
  '642': 'Chi phí quản lý doanh nghiệp',
  '811': 'Chi phí khác',
  '911': 'Xác định kết quả kinh doanh',
};

export const calculateTrialBalancePivot = (transactions: NormalizedTransaction[]): AccountBalancePivotItem[] => {
  const map: Record<string, AccountBalancePivotItem> = {};

  const getOrCreate = (code: string): AccountBalancePivotItem => {
    if (!map[code]) {
      const name = ACCOUNT_NAME_MAP[code] || `Tài khoản ${code}`;
      let type: AccountBalancePivotItem['accountType'] = 'ASSET';
      if (code.startsWith('3') || code.startsWith('4')) type = 'LIABILITY';
      if (code.startsWith('5')) type = 'REVENUE';
      if (code.startsWith('6') || code.startsWith('8')) type = 'EXPENSE';

      map[code] = {
        accountCode: code,
        accountName: name,
        accountType: type,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        closingDebit: 0,
        closingCredit: 0,
        transactions: [],
      };
    }
    return map[code];
  };

  transactions.forEach((t) => {
    if (t.debitAcc) {
      const debitItem = getOrCreate(t.debitAcc);
      debitItem.periodDebit += t.amount;
      debitItem.transactions.push(t);
    }
    if (t.creditAcc) {
      const creditItem = getOrCreate(t.creditAcc);
      creditItem.periodCredit += t.amount;
      creditItem.transactions.push(t);
    }
  });

  // Calculate closing balance
  Object.values(map).forEach((item) => {
    const net = (item.openingDebit - item.openingCredit) + (item.periodDebit - item.periodCredit);
    if (net >= 0) {
      item.closingDebit = net;
      item.closingCredit = 0;
    } else {
      item.closingDebit = 0;
      item.closingCredit = Math.abs(net);
    }
  });

  return Object.values(map).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
};

// --- 2. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (P&L MẪU B02-DN) ---
export interface IncomeStatementReport {
  grossRevenue: number;         // 01. Doanh thu bán hàng & CCDV (TK 511)
  netRevenue: number;           // 10. Doanh thu thuần (TK 511)
  cogs: number;                 // 11. Giá vốn hàng bán (TK 632)
  grossProfit: number;          // 20. Lợi nhuận gộp (Doanh thu thuần - Giá vốn)
  financialRevenue: number;     // 21. Doanh thu tài chính (TK 515)
  financialExpense: number;     // 22. Chi phí tài chính (TK 635)
  sellingExpense: number;       // 25. Chi phí bán hàng (TK 641)
  adminExpense: number;         // 26. Chi phí quản lý doanh nghiệp (TK 642)
  operatingProfit: number;      // 30. Lợi nhuận thuần từ hoạt động kinh doanh
  otherProfit: number;          // 40. Lợi nhuận khác
  profitBeforeTax: number;      // 50. Tổng lợi nhuận kế toán trước thuế
  citTaxExpense: number;        // 51. Chi phí thuế TNDN hiện hành (20%)
  profitAfterTax: number;       // 60. Lợi nhuận sau thuế TNDN
}

export const calculateIncomeStatement = (transactions: NormalizedTransaction[]): IncomeStatementReport => {
  let grossRevenue = 0;
  let cogs = 0;
  let financialRevenue = 0;
  let financialExpense = 0;
  let sellingExpense = 0;
  let adminExpense = 0;

  transactions.forEach((t) => {
    if (t.creditAcc.startsWith('511')) grossRevenue += t.amount;
    if (t.debitAcc.startsWith('632')) cogs += t.amount;
    if (t.creditAcc.startsWith('515')) financialRevenue += t.amount;
    if (t.debitAcc.startsWith('635')) financialExpense += t.amount;
    if (t.debitAcc.startsWith('641')) sellingExpense += t.amount;
    if (t.debitAcc.startsWith('642')) adminExpense += t.amount;
  });

  const netRevenue = grossRevenue;
  const grossProfit = netRevenue - cogs;
  const operatingProfit = grossProfit + financialRevenue - financialExpense - sellingExpense - adminExpense;
  const otherProfit = 0;
  const profitBeforeTax = operatingProfit + otherProfit;
  const citTaxExpense = Math.max(0, profitBeforeTax * 0.20);
  const profitAfterTax = profitBeforeTax - citTaxExpense;

  return {
    grossRevenue,
    netRevenue,
    cogs,
    grossProfit,
    financialRevenue,
    financialExpense,
    sellingExpense,
    adminExpense,
    operatingProfit,
    otherProfit,
    profitBeforeTax,
    citTaxExpense,
    profitAfterTax,
  };
};

// --- 3. BẢNG PHÂN BỔ TK 242 & KHẤU HAO TSCĐ (TK 211 / 214) ---
export interface AssetDepreciationItem {
  id: string;
  assetName: string;
  accountCode: string;
  originalPrice: number;    // Nguyên giá
  usefulMonths: number;     // Số tháng phân bổ/khấu hao
  monthlyAmount: number;    // Số tiền phân bổ 1 tháng
  accumulatedAmount: number;// Đã phân bổ/khấu hao lũy kế
  remainingAmount: number;  // Giá trị còn lại
}

export const calculateAssetDepreciationReport = (transactions: NormalizedTransaction[]): AssetDepreciationItem[] => {
  const assets: AssetDepreciationItem[] = [];

  transactions.forEach((t) => {
    if (t.debitAcc.startsWith('211') || t.debitAcc.startsWith('242')) {
      const usefulMonths = t.debitAcc.startsWith('211') ? 60 : 24; // 5 năm cho TSCĐ, 2 năm cho CCDC 242
      const monthlyAmount = t.amount / usefulMonths;
      assets.push({
        id: t.id,
        assetName: t.description || (t.debitAcc.startsWith('211') ? 'Tài sản cố định' : 'Chi phí trả trước CCDC'),
        accountCode: t.debitAcc,
        originalPrice: t.amount,
        usefulMonths,
        monthlyAmount,
        accumulatedAmount: monthlyAmount,
        remainingAmount: t.amount - monthlyAmount,
      });
    }
  });

  return assets;
};
