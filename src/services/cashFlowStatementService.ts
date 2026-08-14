/**
 * Cash Flow Statement Service — Báo Cáo Lưu Chuyển Tiền Tệ (Mẫu B03-DN)
 * Theo Thông tư 200/2014/TT-BTC — Phương pháp GIÁN TIẾP
 *
 * 3 mục chính:
 *   I.  Lưu chuyển tiền từ Hoạt Động Kinh Doanh (Operating)
 *   II. Lưu chuyển tiền từ Hoạt Động Đầu Tư (Investing)
 *   III.Lưu chuyển tiền từ Hoạt Động Tài Chính (Financing)
 *
 * Tiền và tương đương tiền cuối kỳ = Đầu kỳ + (I + II + III)
 */

import { NormalizedTransaction } from '../types/accounting';

// ============================================================
// INTERFACES
// ============================================================

export interface CashFlowLineItem {
  code: string;           // Mã chỉ tiêu (01, 02, 03...)
  label: string;          // Tên chỉ tiêu
  currentPeriod: number;  // Kỳ này
  priorPeriod: number;    // Kỳ trước
  isHeader?: boolean;
  isBold?: boolean;
  level: number;          // 0: Tổng, 1: Mục lớn, 2: Chi tiết
}

export interface CashFlowStatementReport {
  companyName?: string;
  periodLabel?: string;

  // I. HĐKD
  operatingItems: CashFlowLineItem[];
  netCashFromOperating: number;

  // II. HĐĐT
  investingItems: CashFlowLineItem[];
  netCashFromInvesting: number;

  // III. HĐTC
  financingItems: CashFlowLineItem[];
  netCashFromFinancing: number;

  // Tổng hợp
  netCashChange: number;              // = I + II + III
  cashBeginning: number;              // Tiền đầu kỳ
  cashEnding: number;                 // Tiền cuối kỳ
  isReconciled: boolean;              // cashEnding == TK111 + TK112 cuối kỳ
}

// ============================================================
// HELPER
// ============================================================

function sumByDebitPrefix(txs: NormalizedTransaction[], prefix: string): number {
  return txs.filter(t => t.debitAcc?.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
}

function sumByCreditPrefix(txs: NormalizedTransaction[], prefix: string): number {
  return txs.filter(t => t.creditAcc?.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
}

/**
 * Lọc giao dịch liên quan đến Tiền mặt / Tiền gửi NH
 * Giao dịch thu tiền: Nợ 111/112 → tiền vào
 * Giao dịch chi tiền: Có 111/112 → tiền ra
 */
function cashInflows(txs: NormalizedTransaction[], creditAccPrefix: string): number {
  // Tiền thu vào từ TK creditAccPrefix: Nợ 111/112 / Có [creditAccPrefix]
  return txs.filter(t =>
    ((t.debitAcc?.startsWith('111') || t.debitAcc?.startsWith('112'))) &&
    t.creditAcc?.startsWith(creditAccPrefix)
  ).reduce((s, t) => s + t.amount, 0);
}

function cashOutflows(txs: NormalizedTransaction[], debitAccPrefix: string): number {
  // Tiền chi ra cho TK debitAccPrefix: Nợ [debitAccPrefix] / Có 111/112
  return txs.filter(t =>
    t.debitAcc?.startsWith(debitAccPrefix) &&
    ((t.creditAcc?.startsWith('111') || t.creditAcc?.startsWith('112')))
  ).reduce((s, t) => s + t.amount, 0);
}

// ============================================================
// MAIN ENGINE — PHƯƠNG PHÁP GIÁN TIẾP
// ============================================================

export function calculateCashFlowStatement(
  transactions: NormalizedTransaction[],
  priorPeriodTransactions: NormalizedTransaction[] = [],
  cashBeginning: number = 0,
  companyName?: string,
  periodLabel?: string,
): CashFlowStatementReport {

  // =======================================================
  // I. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG KINH DOANH (Gián tiếp)
  // =======================================================

  // 1. Lợi nhuận trước thuế (từ P&L)
  const revenue = sumByCreditPrefix(transactions, '511') + sumByCreditPrefix(transactions, '515') + sumByCreditPrefix(transactions, '711');
  const expenses = sumByDebitPrefix(transactions, '632') + sumByDebitPrefix(transactions, '635') +
    sumByDebitPrefix(transactions, '641') + sumByDebitPrefix(transactions, '642') + sumByDebitPrefix(transactions, '811');
  const profitBeforeTax = revenue - expenses;

  // 2. Điều chỉnh cho các khoản
  const depreciation = sumByDebitPrefix(transactions, '6274') + // Chi phí khấu hao ghi Nợ 627x/642x → Có 214
    transactions.filter(t => t.creditAcc.startsWith('214')).reduce((s, t) => s + t.amount, 0);

  // 3. Thay đổi các khoản phải thu (TK 131 tăng → tiền giảm)
  const receivableChange = sumByDebitPrefix(transactions, '131') - sumByCreditPrefix(transactions, '131');
  
  // 4. Thay đổi hàng tồn kho (TK 152, 156 tăng → tiền giảm)
  const inventoryChange = (sumByDebitPrefix(transactions, '152') - sumByCreditPrefix(transactions, '152')) +
    (sumByDebitPrefix(transactions, '156') - sumByCreditPrefix(transactions, '156'));

  // 5. Thay đổi các khoản phải trả (TK 331 tăng → tiền tăng)
  const payableChange = sumByCreditPrefix(transactions, '331') - sumByDebitPrefix(transactions, '331');

  // 6. Thuế TNDN đã nộp (Nợ 3334 / Có 111,112)
  const taxPaid = -cashOutflows(transactions, '3334');

  // 7. Chi phí trả trước tăng (TK 242)
  const prepaidChange = -(sumByDebitPrefix(transactions, '242') - sumByCreditPrefix(transactions, '242'));

  // 8. Phải trả NLĐ thay đổi
  const employeePayableChange = sumByCreditPrefix(transactions, '334') - sumByDebitPrefix(transactions, '334');

  // 9. BHXH/BHYT thay đổi
  const insurancePayableChange = sumByCreditPrefix(transactions, '338') - sumByDebitPrefix(transactions, '338');

  const netCashFromOperating = profitBeforeTax + depreciation - receivableChange - inventoryChange + payableChange + taxPaid + prepaidChange + employeePayableChange + insurancePayableChange;

  const operatingItems: CashFlowLineItem[] = [
    { code: '', label: 'I. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG KINH DOANH', level: 0, currentPeriod: 0, priorPeriod: 0, isHeader: true, isBold: true },
    { code: '01', label: '1. Lợi nhuận trước thuế', level: 1, currentPeriod: profitBeforeTax, priorPeriod: 0 },
    { code: '02', label: '2. Điều chỉnh: Khấu hao TSCĐ', level: 1, currentPeriod: depreciation, priorPeriod: 0 },
    { code: '03', label: '3. (Tăng)/Giảm các khoản phải thu', level: 1, currentPeriod: -receivableChange, priorPeriod: 0 },
    { code: '04', label: '4. (Tăng)/Giảm hàng tồn kho', level: 1, currentPeriod: -inventoryChange, priorPeriod: 0 },
    { code: '05', label: '5. Tăng/(Giảm) các khoản phải trả', level: 1, currentPeriod: payableChange, priorPeriod: 0 },
    { code: '06', label: '6. Tăng/(Giảm) phải trả NLĐ (TK 334)', level: 1, currentPeriod: employeePayableChange, priorPeriod: 0 },
    { code: '07', label: '7. Tăng/(Giảm) phải trả BHXH (TK 338)', level: 1, currentPeriod: insurancePayableChange, priorPeriod: 0 },
    { code: '08', label: '8. Chi phí trả trước phân bổ (TK 242)', level: 1, currentPeriod: prepaidChange, priorPeriod: 0 },
    { code: '09', label: '9. Thuế TNDN đã nộp', level: 1, currentPeriod: taxPaid, priorPeriod: 0 },
    { code: '20', label: 'Lưu chuyển tiền thuần từ HĐKD', level: 0, currentPeriod: netCashFromOperating, priorPeriod: 0, isBold: true },
  ];

  // =======================================================
  // II. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG ĐẦU TƯ
  // =======================================================

  // Mua sắm TSCĐ (Nợ 211 / Có 111,112)
  const purchaseFixedAssets = -cashOutflows(transactions, '211');
  
  // Thanh lý TSCĐ (Nợ 111,112 / Có 711 hoặc Nợ 111,112 / Có 211)
  const saleFixedAssets = cashInflows(transactions, '211') + cashInflows(transactions, '711');
  
  // Đầu tư tài chính (Nợ 121/228 / Có 111,112)
  const investmentPurchase = -(cashOutflows(transactions, '121') + cashOutflows(transactions, '228'));
  
  // Thu hồi đầu tư (Nợ 111,112 / Có 121/228)
  const investmentRecovery = cashInflows(transactions, '121') + cashInflows(transactions, '228');

  const netCashFromInvesting = purchaseFixedAssets + saleFixedAssets + investmentPurchase + investmentRecovery;

  const investingItems: CashFlowLineItem[] = [
    { code: '', label: 'II. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG ĐẦU TƯ', level: 0, currentPeriod: 0, priorPeriod: 0, isHeader: true, isBold: true },
    { code: '21', label: '1. Tiền chi mua sắm TSCĐ (TK 211)', level: 1, currentPeriod: purchaseFixedAssets, priorPeriod: 0 },
    { code: '22', label: '2. Tiền thu thanh lý TSCĐ', level: 1, currentPeriod: saleFixedAssets, priorPeriod: 0 },
    { code: '23', label: '3. Tiền chi đầu tư tài chính', level: 1, currentPeriod: investmentPurchase, priorPeriod: 0 },
    { code: '24', label: '4. Tiền thu hồi đầu tư', level: 1, currentPeriod: investmentRecovery, priorPeriod: 0 },
    { code: '30', label: 'Lưu chuyển tiền thuần từ HĐĐT', level: 0, currentPeriod: netCashFromInvesting, priorPeriod: 0, isBold: true },
  ];

  // =======================================================
  // III. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG TÀI CHÍNH
  // =======================================================

  // Tiền vay nhận được (Nợ 111,112 / Có 341)
  const borrowingProceeds = cashInflows(transactions, '341');

  // Tiền trả nợ vay (Nợ 341 / Có 111,112)
  const loanRepayments = -cashOutflows(transactions, '341');

  // Vốn góp nhận được (Nợ 111,112 / Có 411)
  const capitalContributions = cashInflows(transactions, '411');

  // Cổ tức / lợi nhuận đã trả (Nợ 421 / Có 111,112)
  const dividendsPaid = -cashOutflows(transactions, '421');

  const netCashFromFinancing = borrowingProceeds + loanRepayments + capitalContributions + dividendsPaid;

  const financingItems: CashFlowLineItem[] = [
    { code: '', label: 'III. LƯU CHUYỂN TIỀN TỪ HOẠT ĐỘNG TÀI CHÍNH', level: 0, currentPeriod: 0, priorPeriod: 0, isHeader: true, isBold: true },
    { code: '31', label: '1. Tiền vay nhận được (TK 341)', level: 1, currentPeriod: borrowingProceeds, priorPeriod: 0 },
    { code: '32', label: '2. Tiền trả nợ gốc vay', level: 1, currentPeriod: loanRepayments, priorPeriod: 0 },
    { code: '33', label: '3. Vốn góp nhận được (TK 411)', level: 1, currentPeriod: capitalContributions, priorPeriod: 0 },
    { code: '34', label: '4. Cổ tức / Lợi nhuận đã trả', level: 1, currentPeriod: dividendsPaid, priorPeriod: 0 },
    { code: '40', label: 'Lưu chuyển tiền thuần từ HĐTC', level: 0, currentPeriod: netCashFromFinancing, priorPeriod: 0, isBold: true },
  ];

  // =======================================================
  // TỔNG HỢP
  // =======================================================

  const netCashChange = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;
  const cashEnding = cashBeginning + netCashChange;

  // So sánh với số dư thực TK 111 + 112
  const actualCashEndDebit = transactions.filter(t => t.debitAcc.startsWith('111') || t.debitAcc.startsWith('112'))
    .reduce((s, t) => s + t.amount, 0);
  const actualCashEndCredit = transactions.filter(t => t.creditAcc.startsWith('111') || t.creditAcc.startsWith('112'))
    .reduce((s, t) => s + t.amount, 0);
  const actualCashEnd = cashBeginning + actualCashEndDebit - actualCashEndCredit;

  const isReconciled = Math.abs(cashEnding - actualCashEnd) < 1;

  return {
    companyName,
    periodLabel,
    operatingItems,
    netCashFromOperating,
    investingItems,
    netCashFromInvesting,
    financingItems,
    netCashFromFinancing,
    netCashChange,
    cashBeginning,
    cashEnding,
    isReconciled,
  };
}
