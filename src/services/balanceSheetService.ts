/**
 * Balance Sheet Service — Bảng Cân Đối Kế Toán (Mẫu B01-DN)
 * Theo Thông tư 200/2014/TT-BTC
 * 
 * Tự động tổng hợp:
 * - TÀI SẢN NGẮN HẠN (Mã 100): TK 111, 112, 131, 133, 141, 152, 153, 156
 * - TÀI SẢN DÀI HẠN (Mã 200): TK 211 - 214, 242
 * - NỢ PHẢI TRẢ (Mã 300): TK 331, 333, 334, 338, 341
 * - VỐN CHỦ SỞ HỮU (Mã 400): TK 411, 421
 * 
 * Kiểm tra nguyên tắc cân bằng: TỔNG TÀI SẢN = TỔNG NGUỒN VỐN
 */

import { NormalizedTransaction } from '../types/accounting';
import { buildAccountAggregator } from './accountAggregator';

// ============================================================
// INTERFACES
// ============================================================

export interface BalanceSheetLineItem {
  code: string;          // Mã chỉ tiêu (VD: 110, 120, 130...)
  label: string;         // Tên chỉ tiêu
  level: number;         // Cấp indent (0: Tổng, 1: Mục lớn, 2: Chi tiết)
  endOfPeriod: number;   // Số cuối kỳ
  beginOfYear: number;   // Số đầu năm
  isHeader?: boolean;    // Là dòng tiêu đề section
  isBold?: boolean;      // In đậm (dòng tổng)
}

export interface BalanceSheetReport {
  companyName?: string;
  periodLabel?: string;         // VD: "Quý III/2026"
  
  // A. TÀI SẢN
  assets: BalanceSheetLineItem[];
  totalCurrentAssets: number;     // Mã 100
  totalNonCurrentAssets: number;  // Mã 200
  totalAssets: number;            // Mã 270

  // B. NGUỒN VỐN
  liabilitiesAndEquity: BalanceSheetLineItem[];
  totalCurrentLiabilities: number;   // Mã 310
  totalNonCurrentLiabilities: number;// Mã 330
  totalLiabilities: number;          // Mã 300
  totalEquity: number;               // Mã 400
  totalLiabilitiesAndEquity: number; // Mã 440

  // Kiểm tra cân bằng
  isBalanced: boolean;
  balanceDifference: number;
}

// ============================================================
// MAIN ENGINE
// ============================================================

export function calculateBalanceSheet(
  transactions: NormalizedTransaction[],
  beginOfYearTransactions: NormalizedTransaction[] = [],
  companyName?: string,
  periodLabel?: string
): BalanceSheetReport {
  const aggregator = buildAccountAggregator(transactions);
  const aggregatorBOY = buildAccountAggregator(beginOfYearTransactions);

  // Hàm tiện ích lấy dư cuối kỳ từ Memoized Aggregator
  const bal = (prefix: string, side: 'DEBIT' | 'CREDIT') => aggregator.getAccountBalance(prefix, side);
  const balBOY = (prefix: string, side: 'DEBIT' | 'CREDIT') => aggregatorBOY.getAccountBalance(prefix, side);
  const contraBal = (prefix: string) => aggregator.getContraAssetBalance(prefix);
  const contraBalBOY = (prefix: string) => aggregatorBOY.getContraAssetBalance(prefix);

  // ============================================================
  // A. TÀI SẢN
  // ============================================================

  // I. Tài sản ngắn hạn (Mã 100)
  const cash = bal('111', 'DEBIT');                        // 111 Tiền mặt
  const bankDeposit = bal('112', 'DEBIT');                 // 112 Tiền gửi NH
  const shortTermInvestment = bal('121', 'DEBIT');         // 121 Đầu tư TC ngắn hạn
  const accountsReceivable = Math.max(0, bal('131', 'DEBIT'));   // 131 Phải thu KH (chỉ khi dư Nợ)
  const prepaidToSellers = Math.max(0, bal('331', 'DEBIT'));     // 331 dư Nợ = Trả trước NCC (chỉ khi dư Nợ)
  const advances = bal('141', 'DEBIT');                    // 141 Tạm ứng
  const vatDeductible = bal('133', 'DEBIT');               // 133 Thuế GTGT khấu trừ
  const otherReceivables = bal('138', 'DEBIT');            // 138 Phải thu khác
  const rawMaterials = bal('152', 'DEBIT');                // 152 Nguyên vật liệu
  const tools = bal('153', 'DEBIT');                       // 153 Công cụ dụng cụ
  const merchandise = bal('156', 'DEBIT');                 // 156 Hàng hóa
  const workInProgress = bal('154', 'DEBIT');              // 154 Chi phí SXKD dở dang

  const inventories = rawMaterials + tools + merchandise + workInProgress;
  const shortTermReceivables = accountsReceivable + prepaidToSellers + advances + vatDeductible + otherReceivables;
  const cashAndEquivalents = cash + bankDeposit;

  const totalCurrentAssets = cashAndEquivalents + shortTermInvestment + shortTermReceivables + inventories;

  // II. Tài sản dài hạn (Mã 200)
  const fixedAssetsGross = bal('211', 'DEBIT');            // 211 Nguyên giá TSCĐ
  const accumulatedDepreciation = contraBal('214'); // 214 Hao mòn lũy kế
  const fixedAssetsNet = fixedAssetsGross - accumulatedDepreciation;

  const longTermPrepaid = bal('242', 'DEBIT');             // 242 Chi phí trả trước dài hạn
  const longTermInvestment = bal('228', 'DEBIT');          // 228 Đầu tư dài hạn

  const totalNonCurrentAssets = fixedAssetsNet + longTermPrepaid + longTermInvestment;
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  // --- Số đầu năm cho Tài sản ---
  const cashBOY = balBOY('111', 'DEBIT') + balBOY('112', 'DEBIT');
  const receivablesBOY = balBOY('131', 'DEBIT') + balBOY('141', 'DEBIT') + balBOY('133', 'DEBIT');
  const inventoriesBOY = balBOY('152', 'DEBIT') + balBOY('153', 'DEBIT') + balBOY('156', 'DEBIT') + balBOY('154', 'DEBIT');
  const currentAssetsBOY = cashBOY + receivablesBOY + inventoriesBOY;
  const fixedAssetsBOY = balBOY('211', 'DEBIT') - contraBalBOY('214');
  const nonCurrentAssetsBOY = fixedAssetsBOY + balBOY('242', 'DEBIT');
  const totalAssetsBOY = currentAssetsBOY + nonCurrentAssetsBOY;

  const assets: BalanceSheetLineItem[] = [
    { code: '', label: 'A - TÀI SẢN', level: 0, endOfPeriod: totalAssets, beginOfYear: totalAssetsBOY, isHeader: true, isBold: true },
    { code: '100', label: 'I. Tài sản ngắn hạn', level: 1, endOfPeriod: totalCurrentAssets, beginOfYear: currentAssetsBOY, isBold: true },
    { code: '110', label: '1. Tiền và các khoản tương đương tiền', level: 2, endOfPeriod: cashAndEquivalents, beginOfYear: cashBOY },
    { code: '111', label: '   - Tiền mặt (TK 111)', level: 2, endOfPeriod: cash, beginOfYear: balBOY('111', 'DEBIT') },
    { code: '112', label: '   - Tiền gửi ngân hàng (TK 112)', level: 2, endOfPeriod: bankDeposit, beginOfYear: balBOY('112', 'DEBIT') },
    { code: '120', label: '2. Đầu tư tài chính ngắn hạn', level: 2, endOfPeriod: shortTermInvestment, beginOfYear: 0 },
    { code: '130', label: '3. Các khoản phải thu ngắn hạn', level: 2, endOfPeriod: shortTermReceivables, beginOfYear: receivablesBOY },
    { code: '131', label: '   - Phải thu khách hàng (TK 131)', level: 2, endOfPeriod: accountsReceivable, beginOfYear: balBOY('131', 'DEBIT') },
    { code: '132', label: '   - Trả trước cho người bán (TK 331 dư Nợ)', level: 2, endOfPeriod: Math.max(0, prepaidToSellers), beginOfYear: 0 },
    { code: '133', label: '   - Thuế GTGT được khấu trừ (TK 133)', level: 2, endOfPeriod: vatDeductible, beginOfYear: balBOY('133', 'DEBIT') },
    { code: '140', label: '4. Hàng tồn kho', level: 2, endOfPeriod: inventories, beginOfYear: inventoriesBOY },
    { code: '141', label: '   - Nguyên vật liệu (TK 152)', level: 2, endOfPeriod: rawMaterials, beginOfYear: balBOY('152', 'DEBIT') },
    { code: '142', label: '   - Hàng hóa (TK 156)', level: 2, endOfPeriod: merchandise, beginOfYear: balBOY('156', 'DEBIT') },
    { code: '150', label: '5. Tài sản ngắn hạn khác', level: 2, endOfPeriod: advances, beginOfYear: balBOY('141', 'DEBIT') },
    { code: '200', label: 'II. Tài sản dài hạn', level: 1, endOfPeriod: totalNonCurrentAssets, beginOfYear: nonCurrentAssetsBOY, isBold: true },
    { code: '220', label: '1. Tài sản cố định', level: 2, endOfPeriod: fixedAssetsNet, beginOfYear: fixedAssetsBOY },
    { code: '221', label: '   - Nguyên giá (TK 211)', level: 2, endOfPeriod: fixedAssetsGross, beginOfYear: balBOY('211', 'DEBIT') },
    { code: '222', label: '   - Giá trị hao mòn lũy kế (TK 214)', level: 2, endOfPeriod: -accumulatedDepreciation, beginOfYear: 0 },
    { code: '260', label: '2. Chi phí trả trước dài hạn (TK 242)', level: 2, endOfPeriod: longTermPrepaid, beginOfYear: balBOY('242', 'DEBIT') },
    { code: '270', label: 'TỔNG CỘNG TÀI SẢN (270 = 100 + 200)', level: 0, endOfPeriod: totalAssets, beginOfYear: totalAssetsBOY, isBold: true },
  ];

  // ============================================================
  // B. NGUỒN VỐN
  // ============================================================

  // I. Nợ phải trả (Mã 300)
  const accountsPayable = Math.max(0, bal('331', 'CREDIT'));     // 331 Phải trả NCC (chỉ khi dư Có)
  const taxPayable = Math.max(0, bal('333', 'CREDIT'));           // 333 Thuế phải nộp NN
  const employeePayable = Math.max(0, bal('334', 'CREDIT'));      // 334 Phải trả NLĐ
  const socialInsurancePayable = Math.max(0, bal('338', 'CREDIT'));// 338 Phải trả BHXH/BHYT/BHTN
  const customerPrepaid = Math.max(0, bal('131', 'CREDIT'));      // 131 dư Có = Khách hàng trả trước (chỉ khi dư Có)
  const otherCurrentLiabilities = bal('335', 'CREDIT') + bal('336', 'CREDIT'); // 335 CP phải trả + 336 Phải trả nội bộ
  const longTermLoans = bal('341', 'CREDIT');               // 341 Vay dài hạn

  const totalCurrentLiabilities = accountsPayable + taxPayable + employeePayable + socialInsurancePayable + customerPrepaid + otherCurrentLiabilities;
  const totalNonCurrentLiabilities = longTermLoans;
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  // II. Vốn chủ sở hữu (Mã 400)
  const ownersCapital = bal('411', 'CREDIT');               // 411 Vốn đầu tư CSH
  const retainedEarnings = bal('421', 'CREDIT');            // 421 LNST chưa phân phối
  const reserveFund = bal('414', 'CREDIT');                 // 414 Quỹ dự phòng

  // Tự động tính Lợi nhuận chưa kết chuyển từ TK doanh thu/chi phí (5xx, 6xx, 7xx, 8xx)
  // Khi chưa lập bút toán kết chuyển Nợ 911 / Có 421, các TK này vẫn còn số dư
  // → Cần cộng thêm vào Vốn CSH để đảm bảo Tổng TS = Tổng NV
  const revenueTotal = bal('511', 'CREDIT') + bal('515', 'CREDIT') + bal('711', 'CREDIT');
  const expenseTotal = bal('632', 'DEBIT') + bal('635', 'DEBIT') + bal('641', 'DEBIT') + bal('642', 'DEBIT') + bal('811', 'DEBIT');
  const undistributedProfit = revenueTotal - expenseTotal;  // Lợi nhuận kỳ này chưa kết chuyển

  const totalEquity = ownersCapital + retainedEarnings + reserveFund + undistributedProfit;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  // --- Số đầu năm cho Nguồn vốn ---
  const liabilitiesBOY = balBOY('331', 'CREDIT') + balBOY('333', 'CREDIT') + balBOY('334', 'CREDIT') + balBOY('338', 'CREDIT');
  const equityBOY = balBOY('411', 'CREDIT') + balBOY('421', 'CREDIT');
  const totalLiabAndEquityBOY = liabilitiesBOY + equityBOY;

  const liabilitiesAndEquity: BalanceSheetLineItem[] = [
    { code: '', label: 'B - NGUỒN VỐN', level: 0, endOfPeriod: totalLiabilitiesAndEquity, beginOfYear: totalLiabAndEquityBOY, isHeader: true, isBold: true },
    { code: '300', label: 'I. Nợ phải trả', level: 1, endOfPeriod: totalLiabilities, beginOfYear: liabilitiesBOY, isBold: true },
    { code: '310', label: '1. Nợ ngắn hạn', level: 2, endOfPeriod: totalCurrentLiabilities, beginOfYear: liabilitiesBOY, isBold: true },
    { code: '311', label: '   - Phải trả người bán (TK 331)', level: 2, endOfPeriod: accountsPayable, beginOfYear: balBOY('331', 'CREDIT') },
    { code: '312', label: '   - Người mua trả tiền trước (TK 131 dư Có)', level: 2, endOfPeriod: Math.max(0, customerPrepaid), beginOfYear: 0 },
    { code: '313', label: '   - Thuế phải nộp Nhà nước (TK 333)', level: 2, endOfPeriod: taxPayable, beginOfYear: balBOY('333', 'CREDIT') },
    { code: '314', label: '   - Phải trả người lao động (TK 334)', level: 2, endOfPeriod: employeePayable, beginOfYear: balBOY('334', 'CREDIT') },
    { code: '315', label: '   - Phải trả BHXH/BHYT/BHTN (TK 338)', level: 2, endOfPeriod: socialInsurancePayable, beginOfYear: balBOY('338', 'CREDIT') },
    { code: '330', label: '2. Nợ dài hạn', level: 2, endOfPeriod: totalNonCurrentLiabilities, beginOfYear: 0 },
    { code: '338', label: '   - Vay dài hạn (TK 341)', level: 2, endOfPeriod: longTermLoans, beginOfYear: 0 },
    { code: '400', label: 'II. Vốn chủ sở hữu', level: 1, endOfPeriod: totalEquity, beginOfYear: equityBOY, isBold: true },
    { code: '411', label: '1. Vốn đầu tư của chủ sở hữu (TK 411)', level: 2, endOfPeriod: ownersCapital, beginOfYear: balBOY('411', 'CREDIT') },
    { code: '421', label: '2. Lợi nhuận sau thuế chưa phân phối (TK 421)', level: 2, endOfPeriod: retainedEarnings, beginOfYear: balBOY('421', 'CREDIT') },
    { code: '421b', label: '3. Lợi nhuận kỳ này chưa kết chuyển (DT-CP)', level: 2, endOfPeriod: undistributedProfit, beginOfYear: 0 },
    { code: '440', label: 'TỔNG CỘNG NGUỒN VỐN (440 = 300 + 400)', level: 0, endOfPeriod: totalLiabilitiesAndEquity, beginOfYear: totalLiabAndEquityBOY, isBold: true },
  ];

  // ============================================================
  // KIỂM TRA CÂN BẰNG
  // ============================================================
  const balanceDifference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
  const isBalanced = balanceDifference < 1; // Cho phép sai số < 1 VND do làm tròn

  return {
    companyName,
    periodLabel,
    assets,
    totalCurrentAssets,
    totalNonCurrentAssets,
    totalAssets,
    liabilitiesAndEquity,
    totalCurrentLiabilities,
    totalNonCurrentLiabilities,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced,
    balanceDifference,
  };
}
