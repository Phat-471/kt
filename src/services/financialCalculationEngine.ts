import { NormalizedTransaction } from '../types/accounting';
import { calculateIncomeStatement } from './financialReportService';
import { auditNonDeductibleExpenses } from './taxAuditService';

export interface BreakEvenPointResult {
  fixedCosts: number;        // Định phí (Chi phí quản lý 642 + Khấu hao 214 + Thuê nhà 6427)
  variableCosts: number;     // Biến phí (Giá vốn 632 + Chi phí bán hàng 641 + NVL 152)
  totalRevenue: number;      // Doanh thu thực tế
  contributionMargin: number;// Tỷ lệ số phí đảm phí (%)
  breakEvenRevenue: number;  // Doanh thu hòa vốn tối thiểu
  safetyMarginAmount: number;// Mức an toàn doanh thu (VNĐ)
  safetyMarginPercent: number;// Tỷ lệ an toàn doanh thu (%)
  status: 'SAFE' | 'WARNING' | 'LOSS';
}

export interface QuarterlyTaxEstimate {
  quarter: string; // VD: "Q3/2026"
  estimatedRevenue: number;
  estimatedExpense: number;
  accountingProfit: number;
  nonDeductibleExpenseB4: number; // Chi phí bị loại chỉ tiêu [B4]
  taxableIncome: number;           // Thu nhập chịu thuế TNDN
  taxRatePercent: number;          // 20%
  citTaxAmount: number;            // Tiền thuế TNDN tạm tính quý phải nộp
  recommendedVatPrepay: number;    // Dự báo thuế GTGT tạm nộp
}

export const calculateBreakEvenPoint = (transactions: NormalizedTransaction[]): BreakEvenPointResult => {
  const incomeStmt = calculateIncomeStatement(transactions);
  const totalRevenue = incomeStmt.netRevenue > 0 ? incomeStmt.netRevenue : incomeStmt.grossRevenue;

  // Định phí: Chi phí QLDN 642 + Chi phí tài chính 635
  const fixedCosts = incomeStmt.adminExpense + incomeStmt.financialExpense;
  // Biến phí: Giá vốn hàng bán 632 + Chi phí bán hàng 641
  const variableCosts = incomeStmt.cogs + incomeStmt.sellingExpense;

  const contributionMarginVal = totalRevenue - variableCosts;
  const contributionMargin = totalRevenue > 0 ? contributionMarginVal / totalRevenue : 0.4;

  const breakEvenRevenue = contributionMargin > 0 ? fixedCosts / contributionMargin : fixedCosts * 2.5;
  const safetyMarginAmount = totalRevenue - breakEvenRevenue;
  const safetyMarginPercent = totalRevenue > 0 ? (safetyMarginAmount / totalRevenue) * 100 : 0;

  let status: BreakEvenPointResult['status'] = 'SAFE';
  if (safetyMarginAmount < 0) status = 'LOSS';
  else if (safetyMarginPercent < 15) status = 'WARNING';

  return {
    fixedCosts,
    variableCosts,
    totalRevenue,
    contributionMargin: Number((contributionMargin * 100).toFixed(1)),
    breakEvenRevenue: Math.round(breakEvenRevenue),
    safetyMarginAmount: Math.round(safetyMarginAmount),
    safetyMarginPercent: Number(safetyMarginPercent.toFixed(1)),
    status,
  };
};

export const estimateQuarterlyTax = (transactions: NormalizedTransaction[], quarterLabel: string = 'Q3/2026'): QuarterlyTaxEstimate => {
  const incomeStmt = calculateIncomeStatement(transactions);
  const citAudit = auditNonDeductibleExpenses(transactions);

  const estimatedRevenue = incomeStmt.grossRevenue;
  const estimatedExpense = incomeStmt.cogs + incomeStmt.adminExpense + incomeStmt.sellingExpense + incomeStmt.financialExpense;
  const accountingProfit = incomeStmt.operatingProfit;

  const nonDeductibleExpenseB4 = citAudit.totalNonDeductibleAmount;
  const taxableIncome = Math.max(0, accountingProfit + nonDeductibleExpenseB4);
  const citTaxAmount = Math.round(taxableIncome * 0.20); // 20% thuế TNDN
  const recommendedVatPrepay = Math.round(estimatedRevenue * 0.10 * 0.3); // Tạm tính 30% VAT

  return {
    quarter: quarterLabel,
    estimatedRevenue,
    estimatedExpense,
    accountingProfit,
    nonDeductibleExpenseB4,
    taxableIncome,
    taxRatePercent: 20,
    citTaxAmount,
    recommendedVatPrepay,
  };
};
