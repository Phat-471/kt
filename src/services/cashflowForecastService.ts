import { NormalizedTransaction } from '../types/accounting';
import { calculatePartnerDebtReport, calculateCashAndBankLedger } from './accountingCoreService';

export interface CashflowForecastItem {
  periodDays: '30_DAYS' | '60_DAYS' | '90_DAYS';
  expectedInflow: number;  // Thu từ nợ 131 trong hạn
  expectedOutflow: number; // Chi trả nợ 331 trong hạn
  netCashflow: number;     // Dòng tiền ròng dự kiến
  endingCashBalance: number;
}

export interface CashflowForecastResult {
  currentCashAndBankBalance: number;
  monthlyBurnRate: number;      // Tốc độ chi tiêu/đốt tiền trung bình tháng
  runwayMonths: number;         // Số tháng duy trì được dựa trên lượng tiền hiện có
  forecasts: CashflowForecastItem[];
}

export const calculateCashflowForecast = (transactions: NormalizedTransaction[]): CashflowForecastResult => {
  const cashBank = calculateCashAndBankLedger(transactions);
  const currentCashAndBankBalance = cashBank.cashBalance + cashBank.bankBalance;

  const debtList = calculatePartnerDebtReport(transactions);
  const receivable131 = debtList
    .filter((d) => d.type === 'RECEIVABLE_131')
    .reduce((sum, d) => sum + d.currentDebt, 0);

  const payable331 = debtList
    .filter((d) => d.type === 'PAYABLE_331')
    .reduce((sum, d) => sum + d.currentDebt, 0);

  // Tốc độ đốt tiền tháng (Burn Rate) từ các khoản chi tiền mặt / ngân hàng
  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE' || t.creditAcc.startsWith('111') || t.creditAcc.startsWith('112'))
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyBurnRate = totalExpense > 0 ? totalExpense / 3 : 1000000;
  const runwayMonths = monthlyBurnRate > 0 ? Math.max(0, currentCashAndBankBalance / monthlyBurnRate) : 99;

  const forecast30: CashflowForecastItem = {
    periodDays: '30_DAYS',
    expectedInflow: receivable131 * 0.6,
    expectedOutflow: payable331 * 0.7,
    netCashflow: (receivable131 * 0.6) - (payable331 * 0.7),
    endingCashBalance: currentCashAndBankBalance + ((receivable131 * 0.6) - (payable331 * 0.7)),
  };

  const forecast60: CashflowForecastItem = {
    periodDays: '60_DAYS',
    expectedInflow: receivable131 * 0.85,
    expectedOutflow: payable331 * 0.9,
    netCashflow: (receivable131 * 0.85) - (payable331 * 0.9),
    endingCashBalance: currentCashAndBankBalance + ((receivable131 * 0.85) - (payable331 * 0.9)),
  };

  const forecast90: CashflowForecastItem = {
    periodDays: '90_DAYS',
    expectedInflow: receivable131 * 1.0,
    expectedOutflow: payable331 * 1.0,
    netCashflow: receivable131 - payable331,
    endingCashBalance: currentCashAndBankBalance + (receivable131 - payable331),
  };

  return {
    currentCashAndBankBalance,
    monthlyBurnRate,
    runwayMonths: parseFloat(runwayMonths.toFixed(1)),
    forecasts: [forecast30, forecast60, forecast90],
  };
};
